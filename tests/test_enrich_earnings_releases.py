import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch


spec = importlib.util.spec_from_file_location(
    "supplement", Path(__file__).resolve().parents[1] / "scripts/enrich-earnings-releases.py")
supplement = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supplement)

BALANCE = """
<h2>Condensed Consolidated Balance Sheets</h2><p>(In millions)</p>
<table>
 <tr><td></td><td>October 25,</td><td>January 25,</td></tr>
 <tr><td></td><td>2026</td><td>2026</td></tr>
 <tr><td>Shareholders’ equity</td><td>266,666</td><td>157,293</td></tr>
</table>
"""
CASH = """
<table>
 <tr><td colspan="12">Condensed Consolidated Statements of Cash Flows</td></tr>
 <tr><td colspan="12">(In millions)</td></tr>
 <tr><td></td><td colspan="4">Three Months Ended</td><td colspan="4">Nine Months Ended</td></tr>
 <tr><td></td><td>October 25,</td><td>October 26,</td><td>October 25,</td><td>October 26,</td></tr>
 <tr><td></td><td>2026</td><td>2025</td><td>2026</td><td>2025</td></tr>
 <tr><td>Net cash provided by operating activities</td><td>$</td><td>48,253</td><td>23,750</td><td>122,675</td><td>66,530</td></tr>
 <tr><td>Purchases related to property and equipment and intangible assets</td>
     <td>(4,422</td><td>)</td><td>(1,637)</td><td>(8,856)</td><td>(4,758)</td></tr>
</table>
"""


class SupplementTest(unittest.TestCase):
    def test_cash_flow_matches_grouped_quarter_heading_and_ignores_ytd_columns(self):
        zoom_cash = """
<h2>Condensed Consolidated Statements of Cash Flows</h2><p>(Unaudited, in thousands)</p>
<table>
 <tr><td></td><td colspan="2">Three Months Ended October 31,</td><td colspan="2">Nine Months Ended October 31,</td></tr>
 <tr><td></td><td>2026</td><td>2025</td><td>2026</td><td>2025</td></tr>
 <tr><td>Net cash provided by operating activities</td><td>587,885</td><td>629,326</td><td>1,604,246</td><td>1,634,527</td></tr>
 <tr><td>Purchases of property and equipment</td><td>(29,785)</td><td>(15,009)</td><td>(73,251)</td><td>(48,885)</td></tr>
</table>
"""
        amounts = supplement.parse_supplement(zoom_cash, "2026-10-31")
        self.assertAlmostEqual(amounts["operatingCashFlowBn"], .587885)
        self.assertAlmostEqual(amounts["capexBn"], .029785)
        self.assertEqual(supplement.parse_supplement(zoom_cash, "2025-10-31"), {})
        ytd_first = zoom_cash.replace("Three Months Ended", "Six Months Ended", 1)
        self.assertEqual(supplement.parse_supplement(ytd_first, "2026-10-31"), {})

    def test_balance_sheet_with_units_in_split_year_row_uses_consolidated_equity(self):
        release = """
<div><table><tr><td>Walmart Inc. Condensed Consolidated Balance Sheets (Unaudited)</td><td></td></tr></table></div>
<div><table>
 <tr><td></td><td>October 31,</td><td>January 31,</td><td>October 31,</td></tr>
 <tr><td>(Amounts in millions)</td><td>2026</td><td>2026</td><td>2025</td></tr>
 <tr><td>Total Walmart shareholders’ equity</td><td>100,223</td><td>99,617</td><td>96,094</td></tr>
 <tr><td>Noncontrolling interest</td><td>6,245</td><td>6,270</td><td>6,112</td></tr>
 <tr><td>Total shareholders’ equity</td><td>106,468</td><td>105,887</td><td>102,206</td></tr>
</table></div>
"""
        self.assertEqual(supplement.parse_supplement(release, "2026-10-31"), {"netAssetsBn": 106.468})
        self.assertEqual(supplement.parse_supplement(release, "2025-10-31"), {})
        self.assertEqual(supplement.parse_supplement(release.replace("2026</td><td>2025", "2025"), "2026-10-31"), {})
        self.assertEqual(supplement.parse_supplement(release.replace("(Unaudited)", "1,234"), "2026-10-31"), {})

    def test_extracts_nvidia_style_tables_with_period_and_unit_checks(self):
        self.assertEqual(supplement.parse_supplement(BALANCE + CASH, "2026-10-25"),
                         {"netAssetsBn": 266.666, "operatingCashFlowBn": 48.253, "capexBn": 4.422})
        self.assertEqual(supplement.parse_supplement(BALANCE + CASH, "2025-10-26"), {})
        self.assertEqual(supplement.parse_supplement(CASH.replace("Three Months Ended", "Nine Months Ended"), "2026-10-25"), {})
        self.assertEqual(supplement.parse_supplement(CASH.replace("In millions", "Unaudited"), "2026-10-25"), {})

    def test_enriches_sibling_exhibits_and_keeps_a_source_per_field(self):
        primary, sibling = "https://example.test/primary.htm", "https://example.test/supplement.htm"
        entry = {"statementSourceUrl": primary, "statementCurrency": "USD", "periodEnd": "2026-10-25"}
        report = {"report": [{"needsUpdate": True, "release": {"entry": entry}}]}
        supplement.enrich(report, {primary: BALANCE, sibling: CASH}.__getitem__, lambda _: [sibling])
        self.assertEqual(entry["supplementalFieldSources"],
                         {"netAssetsBn": primary, "operatingCashFlowBn": sibling, "capexBn": sibling})
        self.assertEqual(entry["capexBn"], 4.422)

    def test_cli_uses_the_shared_sec_filing_inventory_to_complete_cash_flow(self):
        base = "https://www.sec.gov/Archives/edgar/data/1585521/000158552126000170/"
        source, companion = base + "release.htm", base + "cash flow.htm"
        entry = {"statementSourceUrl": source, "statementCurrency": "USD", "periodEnd": "2026-10-25"}
        report = {"report": [{"needsUpdate": True, "release": {"entry": entry}}]}
        request = Mock(side_effect={source: BALANCE.encode(), base + "cash%20flow.htm": CASH.encode()}.__getitem__)
        discover = Mock(return_value=["release.htm", "slides.pdf", "cash flow.htm"])
        modules = {"official_segments": SimpleNamespace(_request=request),
                   "earnings_release": SimpleNamespace(discover_filing_exhibits=discover)}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "report.json"
            path.write_text(json.dumps(report))
            args = ["enrich-earnings-releases.py", "--source-scripts", directory, "--report", str(path)]
            with patch.dict(sys.modules, modules), patch.object(sys, "argv", args), patch.object(sys, "path", list(sys.path)):
                supplement.main()
            check = json.loads(path.read_text())["report"][0]
        updated = check["release"]["entry"]
        self.assertNotIn("supplementalWarnings", check)
        self.assertEqual(updated["operatingCashFlowBn"], 48.253)
        self.assertEqual(updated["supplementalFieldSources"]["operatingCashFlowBn"], companion.replace(" ", "%20"))
        discover.assert_called_once_with(base)


if __name__ == "__main__":
    unittest.main()
