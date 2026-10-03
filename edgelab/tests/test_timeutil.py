from edgelab.timeutil import first_tradable_open, market_phase, next_trading_day, prev_trading_day


def test_premarket_info_trades_same_open():
    assert first_tradable_open("2026-10-02T12:00:00Z") == "2026-10-02"   # 08:00 ET Friday


def test_info_after_open_waits_for_next_session():
    assert first_tradable_open("2026-10-02T13:31:00Z") == "2026-10-05"   # 09:31 ET Friday -> Monday


def test_info_just_before_auction_cutoff_misses_it():
    assert first_tradable_open("2026-10-02T13:27:00Z") == "2026-10-05"   # 09:27 ET, OPG cutoff 09:25 margin


def test_after_hours_and_weekend():
    assert first_tradable_open("2026-10-02T21:00:00Z") == "2026-10-05"
    assert first_tradable_open("2026-10-03T15:00:00Z") == "2026-10-05"


def test_holiday_skipped():
    assert first_tradable_open("2026-11-25T22:00:00Z") == "2026-11-27"   # Thanksgiving 26 Nov


def test_calendar_steps():
    assert next_trading_day("2026-10-02") == "2026-10-05"
    assert prev_trading_day("2026-10-05") == "2026-10-02"
    assert next_trading_day("2026-10-02", 5) == "2026-10-09"


def test_market_phase():
    assert market_phase("2026-10-02T21:00:00Z") == "after_hours"
    assert market_phase("2026-10-02T15:00:00Z") == "regular"
    assert market_phase("2026-10-02T11:00:00Z") == "pre_market"
