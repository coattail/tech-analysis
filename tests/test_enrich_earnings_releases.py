import importlib.util
from pathlib import Path
import unittest


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


if __name__ == "__main__":
    unittest.main()
