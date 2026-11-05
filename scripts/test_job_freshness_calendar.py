import unittest
from datetime import datetime, timedelta, timezone

from job_freshness_calendar import add_calendar_months, is_publication_expired, publication_expiry


UTC = timezone.utc


class JobFreshnessCalendarTests(unittest.TestCase):
    def test_two_calendar_months_expire_on_same_day(self):
        published = datetime(2026, 9, 5, 13, 0, tzinfo=UTC)
        self.assertEqual(publication_expiry(published, False), datetime(2026, 11, 5, 13, 0, tzinfo=UTC))

    def test_month_end_clamps_to_last_day(self):
        published = datetime(2026, 8, 31, 10, 15, 20, tzinfo=UTC)
        self.assertEqual(add_calendar_months(published, 2), datetime(2026, 10, 31, 10, 15, 20, tzinfo=UTC))

    def test_february_leap_and_non_leap_clamping(self):
        self.assertEqual(
            add_calendar_months(datetime(2026, 12, 31, tzinfo=UTC), 2),
            datetime(2027, 2, 28, tzinfo=UTC),
        )
        self.assertEqual(
            add_calendar_months(datetime(2027, 12, 31, tzinfo=UTC), 2),
            datetime(2028, 2, 29, tzinfo=UTC),
        )

    def test_estimated_dates_still_use_thirty_days(self):
        published = datetime(2026, 10, 6, tzinfo=UTC)
        self.assertEqual(publication_expiry(published, True), datetime(2026, 11, 5, tzinfo=UTC))

    def test_expiry_boundary_is_strict(self):
        published = datetime(2026, 9, 5, tzinfo=UTC)
        boundary = datetime(2026, 11, 5, tzinfo=UTC)
        self.assertFalse(is_publication_expired(published, False, boundary))
        self.assertTrue(is_publication_expired(published, False, boundary + timedelta(microseconds=1)))


if __name__ == "__main__":
    unittest.main()
