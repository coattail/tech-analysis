import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("resolver", ROOT / "scripts/resolve-earnings-releases.py")
resolver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(resolver)
HTML = (ROOT / "tests/fixtures/berkshire-q2-2026-8k.html").read_text()
URL = "https://www.sec.gov/Archives/edgar/data/1067983/000119312526344495/d159922d8k.htm"


def fixture():
    report = {"report": [{"companyId": "berkshire", "ticker": "BRK.B", "needsUpdate": True,
                         "reason": "earnings-release-detected", "localQuarter": "2026Q2", "remoteQuarter": "",
                         "remoteFilingDate": "2026-08-11", "release": {"form": "8-K", "accession": "0001193125-26-344495"}}]}
    entry = {"revenueBn": 101.808, "netIncomeBn": 25.667, "periodEnd": "2026-06-30", "statementFilingDate": "2026-08-08"}
    universe = {"companies": [{"id": "berkshire", "ticker": "BRK.B"}],
                "local": {"berkshire": {"financials": {"2026Q2": entry}}}}
    return report, universe


class ResolveTests(unittest.TestCase):
    def test_actual_duplicate_8k_uses_announcement_not_sec_filing_date(self):
        report, universe = fixture()
        before = copy.deepcopy(universe)
        resolver.resolve(report, universe, lambda *_: (HTML, URL))
        check = report["report"][0]
        self.assertFalse(check["needsUpdate"])
        self.assertEqual(check["remoteQuarter"], "2026Q2")
        self.assertEqual(check["remoteFilingDate"], "2026-08-11")
        self.assertEqual(check["coverageEvidence"]["announcementDate"], "2026-08-08")
        self.assertEqual(check["coverageEvidence"]["sourceUrl"], URL)
        self.assertEqual(universe, before)

    def test_new_quarters_and_later_same_period_announcements_stay_pending(self):
        for html in [HTML.replace("second quarter and first six months", "third quarter and first nine months")
                          .replace("June&nbsp;30", "September&nbsp;30").replace("August&nbsp;8", "November&nbsp;8"),
                     HTML.replace("August&nbsp;8", "August&nbsp;9")]:
            report, universe = fixture()
            resolver.resolve(report, universe, lambda *_: (html, URL))
            self.assertTrue(report["report"][0]["needsUpdate"])

    def test_ambiguous_periods_corrections_and_missing_dates_stay_pending(self):
        for html in [HTML.replace("ITEM&#8201;2.02", "ITEM 8.01"),
                     HTML.replace("Company’s earnings", "Company’s revised earnings"),
                     HTML.replace("June&nbsp;30", "June&nbsp;29"),
                     HTML.replace("June&nbsp;30", "June&nbsp;31"),
                     HTML.replace("August&nbsp;8", "August&nbsp;32"),
                     HTML.replace("On August&nbsp;8, 2026,", ""),
                     HTML.replace("second quarter and first six months", "first six months")]:
            self.assertIsNone(resolver.parse_announcement(html))

    def test_incomplete_or_misaligned_local_statements_cannot_suppress_release(self):
        for patch in [{"revenueBn": None}, {"revenueBn": 0}, {"netIncomeBn": float("nan")},
                      {"periodEnd": "2026-03-31"}, {"statementFilingDate": "2026-08-07"},
                      {"statementSpanQuarters": 2}, {"statementValueMode": "cumulative"}]:
            report, universe = fixture()
            universe["local"]["berkshire"]["financials"]["2026Q2"].update(patch)
            resolver.resolve(report, universe, lambda *_: (HTML, URL))
            self.assertTrue(report["report"][0]["needsUpdate"])

    def test_network_failure_preserves_original_failure_and_records_diagnostic(self):
        report, universe = fixture()
        def fail(*_):
            raise RuntimeError("SEC unavailable")
        resolver.resolve(report, universe, fail)
        self.assertTrue(report["report"][0]["needsUpdate"])
        self.assertEqual(report["report"][0]["resolutionWarning"], "SEC unavailable")

    def test_parsed_and_explicit_new_quarter_releases_are_not_overridden(self):
        for patch in [{"remoteQuarter": "2026Q3"}, {"release": {"form": "8-K", "entry": {"revenueBn": 123}}},
                      {"reason": "check-failed"}]:
            report, universe = fixture()
            report["report"][0].update(patch)
            before = copy.deepcopy(report)
            def unexpected(*_):
                self.fail("must not fetch already resolved or failed releases")
            resolver.resolve(report, universe, unexpected)
            self.assertEqual(report, before)


if __name__ == "__main__":
    unittest.main()
