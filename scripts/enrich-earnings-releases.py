"""Read supplemental balance-sheet and single-quarter cash-flow rows from release HTML."""
import argparse
from datetime import date
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote, urlparse


BALANCE = r"\b(?:balance sheets?|statements? of financial position)\b"
CASH_FLOW = r"\b(?:statements? of cash flows?|cash flow statements?)\b"
UNITS = {"thousands": 1e-6, "millions": 1e-3, "billions": 1}
UNIT_HEADER = r"\b(?:in|USD)\s+(thousands|millions|billions)\b"
EQUITY = r"(?:total )?(?:shareholders|stockholders)'? equity|total equity"
OPERATING_CASH = r"net cash (?:provided by|used in|from)(?: \(?used in\)?)? operating activities"
CAPEX = (r"(?:(?:purchases?|payments?)(?: related to| to acquire| of| for) (?:property,? plant,? and equipment|"
         r"property and equipment|property,? plant and equipment)(?: and intangible assets)?|capital expenditures)")
NUMBER = r"\(?-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\)?"
QUARTER = r"(?:three months|quarter|13 weeks|thirteen weeks) ended"
MONTH_DAY = r"[A-Za-z]{3,9}\.? \d{1,2},?"
OTHER_DURATION = r"(?:six|nine|twelve) months ended|(?:fiscal )?year ended"
GROUPED_PERIOD_DATE = rf"({QUARTER}|{OTHER_DURATION})\s+({MONTH_DAY})"


def clean(value):
    return " ".join(value.replace("’", "'").split())


def statement_amount(rows, pattern, scale, columns):
    matches = []
    for label, *cells in rows:
        if not re.fullmatch(pattern, label.rstrip(":"), re.I):
            continue
        # Currency and closing parentheses sometimes occupy their own EDGAR cells.
        amounts = [cell for cell in cells if cell not in {"$", ")", "("}]
        if len(amounts) != columns or not amounts:
            continue
        value = amounts[0]
        if value in {"—", "–", "-"}:
            matches.append(0)
        elif re.fullmatch(NUMBER, value):
            amount = float(value.strip("()").replace(",", "")) * scale
            matches.append(-amount if value.startswith("(") else amount)
    return matches[0] if len(matches) == 1 else None


def parse_supplement(html, period_end):
    from bs4 import BeautifulSoup
    target = date.fromisoformat(period_end)
    month, abbreviated = target.strftime("%B"), target.strftime("%b")
    target_date = rf"(?:{month}|{abbreviated}\.?) 0?{target.day},? {target.year}"
    found = {}
    for table in BeautifulSoup(html, "html.parser").find_all("table"):
        if table.find("table"):
            continue
        rows = [
            cells for row in table.find_all("tr")
            if (cells := [value for cell in row.find_all(["th", "td"], recursive=False)
                          if (value := clean(cell.get_text(" ", strip=True)))])
        ]
        header = rows[:10]
        # A split date row must align with its year row. Some filers print the
        # units in the stub column next to the years, not above the table.
        columns = 0
        for i, row in enumerate(header):
            units_stub = None
            date_label = row[0]
            duration = None
            column_count = len(row)
            plain_date = re.fullmatch(MONTH_DAY, date_label)
            grouped_date = re.fullmatch(GROUPED_PERIOD_DATE, date_label, re.I)
            if i + 1 < len(header) and (plain_date or grouped_date):
                years = header[i + 1]
                if re.search(UNIT_HEADER, years[0], re.I):
                    units_stub, *years = years
                if years and all(re.fullmatch(r"20\d{2}", year) for year in years):
                    if plain_date and len(years) == len(row):
                        date_label = f"{date_label} {years[0]}"
                    elif grouped_date and len(years) >= len(row):
                        # Duration and month/day can share a header spanning several year columns.
                        if all(re.fullmatch(GROUPED_PERIOD_DATE, cell, re.I) for cell in row[1:]):
                            duration, end = grouped_date.groups()
                            date_label = f"{end} {years[0]}"
                            column_count = len(years)
            if re.fullmatch(target_date, date_label, re.I):
                columns = column_count
                header = header[:i]
                if units_stub:
                    header.append([units_stub])
                if duration:
                    header.append([duration])
                break
        if not columns:
            continue
        # Some issuers put the statement title and units directly above the table.
        preceding = []
        for node in table.previous_elements:
            if getattr(node, "name", None) == "table" or getattr(node, "name", None) in {"td", "th"}:
                break
            if isinstance(node, str) and (value := clean(node)):
                preceding.append(value)
            if len(preceding) == 10:
                break
        context = " ".join([*reversed(preceding), *(" ".join(row) for row in header)])
        heading = list(re.finditer(rf"{BALANCE}|{CASH_FLOW}", context, re.I))
        if not heading:
            # Some releases put the statement heading in a separate banner
            # table. Only read a short, text-only banner adjacent to this table.
            banner = table.find_previous("table")
            if not banner or (banner.parent is not table.parent and banner.parent.parent is not table.parent.parent):
                continue
            title = clean(banner.get_text(" ", strip=True))
            if len(title) > 200 or re.search(r"\d", title):
                continue
            context = f"{title} {context}"
            heading = list(re.finditer(rf"{BALANCE}|{CASH_FLOW}", context, re.I))
            if len(heading) != 1:
                continue
        statement = heading[-1][0]
        units = re.search(UNIT_HEADER, context[heading[-1].end():], re.I)
        if not units:
            continue
        scale = UNITS[units[1].lower()]
        if re.fullmatch(BALANCE, statement, re.I):
            fields = {"netAssetsBn": statement_amount(rows, EQUITY, scale, columns)}
        else:
            durations = re.search(rf"{QUARTER}|{OTHER_DURATION}", context[heading[-1].end():], re.I)
            if not durations or not re.fullmatch(QUARTER, durations[0], re.I):
                continue
            ocf = statement_amount(rows, OPERATING_CASH, scale, columns)
            capex = statement_amount(rows, CAPEX, scale, columns)
            fields = {"operatingCashFlowBn": ocf, "capexBn": abs(capex) if capex is not None else None}
        for field, value in fields.items():
            if value is not None:
                found.setdefault(field, set()).add(value)
    return {field: values.pop() for field, values in found.items() if len(values) == 1}


def enrich(report, fetch_html, sibling_urls=lambda url: ()):
    fields = ("netAssetsBn", "operatingCashFlowBn", "capexBn")
    for check in report["report"]:
        entry = (check.get("release") or {}).get("entry") or {}
        url = entry.get("statementSourceUrl") or ""
        parsed = urlparse(url)
        if (not check.get("needsUpdate") or not entry.get("periodEnd")
                or entry.get("statementCurrency") != "USD" or parsed.scheme != "https"
                or parsed.path.lower().endswith(".pdf") or all(entry.get(field) is not None for field in fields)):
            continue
        def read(source):
            try:
                values = parse_supplement(fetch_html(source), entry["periodEnd"])
            except Exception as error:
                check.setdefault("supplementalWarnings", []).append(f"{source}: {error}")
                return
            for field, amount in values.items():
                if entry.get(field) is None:
                    entry[field] = amount
                    entry.setdefault("supplementalFieldSources", {})[field] = source

        read(url)
        if any(entry.get(field) is None for field in fields):
            try:
                for sibling in sibling_urls(url):
                    read(sibling)
                    if all(entry.get(field) is not None for field in fields):
                        break
            except Exception as error:
                check.setdefault("supplementalWarnings", []).append(str(error))
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-scripts", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    sys.path.insert(0, str(args.source_scripts.resolve()))
    from official_segments import _request
    from earnings_release import discover_filing_exhibits

    def sibling_urls(url):
        match = re.fullmatch(r"(https://www\.sec\.gov/Archives/edgar/data/\d+/\d{18}/)[^/?#]+", url)
        if not match:
            return []
        base = match[1]
        names = discover_filing_exhibits(base)
        return [base + quote(name) for name in names if name.lower().endswith((".htm", ".html"))
                and base + quote(name) != url][:3]

    report = enrich(json.loads(args.report.read_text()),
                    lambda url: _request(url).decode("utf-8", errors="replace"), sibling_urls)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
