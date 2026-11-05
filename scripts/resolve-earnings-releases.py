"""Resolve duplicate, unparsed 8-Ks using the issuer's explicit announcement.

An SEC filing date is not the release date or the reporting period. Only mark
an unparsed release as covered when its primary document explicitly identifies
an announcement already covered by a complete local quarterly statement.
"""
import argparse
from datetime import date
from html import unescape
import json
import math
from pathlib import Path
import re
import sys


MONTHS = {name: i for i, name in enumerate(
    ("January", "February", "March", "April", "May", "June", "July", "August",
     "September", "October", "November", "December"), 1)}
DATE = r"([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})"


def parse_announcement(html):
    text = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", html, flags=re.I | re.S)
    text = re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]*>", " ", text)))
    item = re.search(r"ITEM\s*2\.02\b(.*?)(?:ITEM\s*\d+\.\d+\b|SIGNATURES|$)", text, re.I)
    if not item or re.search(r"\b(?:amend\w*|correct\w*|revis\w*|restat\w*)\b", item[1], re.I):
        return None
    matches = list(re.finditer(
        rf"On\s+{DATE},?\s+.{{1,300}}?issued a press release announcing\s+"
        rf"[^.]*?earnings for the (first|second|third|fourth) quarter"
        rf"(?: and (?:first )?(?:three|six|nine|twelve) months)? ended\s+{DATE}", item[1]))
    if len(matches) != 1:
        return None
    month, day, year, ordinal, end_month, end_day, end_year = matches[0].groups()
    try:
        announced = date(int(year), MONTHS[month], int(day))
        end = date(int(end_year), MONTHS[end_month], int(end_day))
    except (KeyError, ValueError):
        return None
    quarter = ("first", "second", "third", "fourth").index(ordinal) + 1
    # Only calendar-aligned quarters; fiscal or ambiguous periods remain pending.
    if (end.month, end.day) != ((3, 31), (6, 30), (9, 30), (12, 31))[quarter - 1] or end > announced:
        return None
    return {"quarter": f"{end.year}Q{quarter}", "periodEnd": end.isoformat(),
            "announcementDate": announced.isoformat()}


def sec_primary_document(check, company):
    # Reuse the collector's SEC identity, headers, throttling and retries.
    from official_segments import _request, _request_json, _resolve_cik
    cik = company.get("cik") or _resolve_cik(company["ticker"], False)
    recent = _request_json(f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json")["filings"]["recent"]
    accession = check["release"]["accession"]
    index = recent["accessionNumber"].index(accession)
    if recent["form"][index] != "8-K" or recent["filingDate"][index] != check["remoteFilingDate"]:
        raise ValueError("SEC filing identity does not match the detected release")
    url = (f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession.replace('-', '')}/"
           + recent["primaryDocument"][index])
    return _request(url).decode("utf-8", errors="replace"), url


def resolve(report, universe, fetcher=sec_primary_document):
    companies = {c["id"]: c for c in universe["companies"]}
    for check in report["report"]:
        release = check.get("release") or {}
        if (not check.get("needsUpdate") or check.get("reason") != "earnings-release-detected"
                or release.get("form") != "8-K" or release.get("entry") or check.get("remoteQuarter")):
            continue
        try:
            html, url = fetcher(check, companies[check["companyId"]])
            evidence = parse_announcement(html)
            if not evidence:
                continue
            quarter = evidence["quarter"]
            local = universe.get("local", {}).get(check["companyId"], {}).get("financials", {}).get(quarter, {})
            amounts = [local.get("revenueBn"), local.get("netIncomeBn")]
            complete = all(type(v) in (int, float) and math.isfinite(v) for v in amounts)
            if (complete and amounts[0] > 0 and local.get("statementSpanQuarters", 1) == 1
                    and local.get("statementValueMode") != "cumulative"
                    and local.get("periodEnd") == evidence["periodEnd"]
                    and evidence["announcementDate"] <= local.get("statementFilingDate", "") <= check["remoteFilingDate"]):
                check.update(needsUpdate=False, reason="already-covered-earnings-announcement", remoteQuarter=quarter,
                             coverageEvidence={**evidence, "sourceUrl": url,
                                               "localFilingDate": local["statementFilingDate"]})
                print(f"{check['ticker']}: {quarter} announcement already covered; later 8-K is a duplicate")
        except Exception as error:
            # Preserve needsUpdate: failed or uncertain resolution still fails verification.
            check["resolutionWarning"] = str(error)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-scripts", type=Path, required=True)
    parser.add_argument("--universe", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    sys.path.insert(0, str(args.source_scripts.resolve()))
    report = resolve(json.loads(args.report.read_text()), json.loads(args.universe.read_text()))
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
