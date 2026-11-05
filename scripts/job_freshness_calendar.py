from calendar import monthrange
from datetime import datetime, timedelta


def add_calendar_months(value: datetime, months: int) -> datetime:
    """Add calendar months, clamping to the last valid day of the target month."""
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def publication_expiry(published_at: datetime, estimated: bool) -> datetime:
    """Estimated first-seen dates expire in 30 days; source dates expire in 2 calendar months."""
    if estimated:
        return published_at + timedelta(days=30)
    return add_calendar_months(published_at, 2)


def is_publication_expired(published_at: datetime, estimated: bool, now: datetime) -> bool:
    return now > publication_expiry(published_at, estimated)
