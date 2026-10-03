-- edgelab schema v1
-- Conventions:
--   *_ts   : UTC ISO-8601 timestamp string, e.g. 2026-10-05T13:30:00Z
--   *_date : US/Eastern trading date 'YYYY-MM-DD'
--   Every row that came from outside carries ingested_at (when WE stored it).
--   available_at = the earliest moment the information was public. Backtests and
--   live signals may only use rows with available_at <= decision time.
--   Tables prefixed hs_ hold HINDSIGHT data (reviews, tags, narratives). Nothing in
--   edgelab/strategies or feature code may read them. tests/test_leakage.py enforces it.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ---------------------------------------------------------------- reference data
CREATE TABLE IF NOT EXISTS instruments (
    symbol        TEXT PRIMARY KEY,
    name          TEXT,
    exchange      TEXT,
    asset_class   TEXT,
    cik           INTEGER,
    sic           INTEGER,
    sic_desc      TEXT,
    is_etf        INTEGER DEFAULT 0,
    shortable     INTEGER,
    easy_to_borrow INTEGER,
    status        TEXT,           -- active / inactive as last seen at broker
    first_seen_date TEXT,
    last_seen_date  TEXT,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_instruments_cik ON instruments(cik);

-- Point-in-time universe: what we considered tradable ON that date. Fixes survivorship
-- going forward because delisted names stay in old snapshots.
CREATE TABLE IF NOT EXISTS universe_snapshots (
    snap_date      TEXT NOT NULL,
    symbol         TEXT NOT NULL,
    close          REAL,
    adv20_usd      REAL,          -- 20d average dollar volume
    vol20          REAL,          -- 20d realized daily vol
    size_bucket    TEXT,          -- mega/large/mid/small/micro by adv20_usd
    in_universe    INTEGER NOT NULL,
    exclusion_reason TEXT,
    PRIMARY KEY (snap_date, symbol)
);

-- ---------------------------------------------------------------- market data
CREATE TABLE IF NOT EXISTS bars_daily (
    symbol      TEXT NOT NULL,
    bar_date    TEXT NOT NULL,
    open REAL, high REAL, low REAL, close REAL,
    volume REAL, vwap REAL, trade_count INTEGER,
    adjustment  TEXT NOT NULL DEFAULT 'raw',   -- raw | all
    source      TEXT NOT NULL,                 -- alpaca_sip | alpaca_iex | synthetic | ...
    ingested_at TEXT NOT NULL,
    PRIMARY KEY (symbol, bar_date, adjustment)
);
CREATE INDEX IF NOT EXISTS ix_bars_daily_date ON bars_daily(bar_date);

-- Minute bars are only stored around signal windows (entry day, plus a few days).
CREATE TABLE IF NOT EXISTS bars_minute (
    symbol  TEXT NOT NULL,
    bar_ts  TEXT NOT NULL,
    open REAL, high REAL, low REAL, close REAL, volume REAL, vwap REAL,
    source  TEXT NOT NULL,
    ingested_at TEXT NOT NULL,
    PRIMARY KEY (symbol, bar_ts)
);

CREATE TABLE IF NOT EXISTS corporate_actions (
    symbol TEXT NOT NULL,
    ex_date TEXT NOT NULL,
    action TEXT NOT NULL,      -- split / dividend / delist / symbol_change
    ratio REAL, amount REAL, detail TEXT,
    ingested_at TEXT NOT NULL,
    PRIMARY KEY (symbol, ex_date, action)
);

-- ---------------------------------------------------------------- text / events
CREATE TABLE IF NOT EXISTS filings (
    accession     TEXT PRIMARY KEY,           -- 0000320193-26-000123
    cik           INTEGER NOT NULL,
    symbol        TEXT,                       -- best-effort mapping at ingest time
    company       TEXT,
    form_type     TEXT NOT NULL,
    items         TEXT,                       -- 8-K items, comma separated e.g. '2.02,9.01'
    accepted_ts   TEXT,                       -- EDGAR acceptance datetime (UTC)
    filed_date    TEXT,                       -- EDGAR filing date (ET)
    available_at  TEXT NOT NULL,              -- = accepted_ts if known, else conservative
    primary_doc_url TEXT,
    index_url     TEXT,
    text_sha256   TEXT,                       -- hash of stored text (text kept on disk)
    text_path     TEXT,
    discovered_via TEXT NOT NULL,             -- atom_feed | daily_index | submissions | synthetic
    ingested_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_filings_avail ON filings(available_at);
CREATE INDEX IF NOT EXISTS ix_filings_symbol ON filings(symbol, available_at);
CREATE INDEX IF NOT EXISTS ix_filings_form ON filings(form_type, available_at);

CREATE TABLE IF NOT EXISTS news (
    news_id      TEXT PRIMARY KEY,
    created_ts   TEXT NOT NULL,
    updated_ts   TEXT,
    available_at TEXT NOT NULL,
    headline     TEXT,
    summary      TEXT,
    source       TEXT,
    author       TEXT,
    url          TEXT,
    ingested_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS news_symbols (
    news_id TEXT NOT NULL REFERENCES news(news_id),
    symbol  TEXT NOT NULL,
    PRIMARY KEY (news_id, symbol)
);
CREATE INDEX IF NOT EXISTS ix_news_symbols_symbol ON news_symbols(symbol);

-- Sensor outputs: structured features extracted from text by a model (LLM, FinBERT,
-- dictionary). One row per (document, model, feature). Model + prompt hash are logged
-- so drift can be audited. NOTE: LLM features computed on text that predates the
-- model's training cutoff are contaminated by look-ahead and are flagged as such.
CREATE TABLE IF NOT EXISTS sensor_outputs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_kind      TEXT NOT NULL,               -- filing | news | transcript
    doc_id        TEXT NOT NULL,
    model         TEXT NOT NULL,
    model_cutoff_date TEXT,                    -- training cutoff of the model, if known
    prompt_sha256 TEXT,
    feature       TEXT NOT NULL,
    value_num     REAL,
    value_text    TEXT,
    lookahead_contaminated INTEGER NOT NULL DEFAULT 0,
    computed_at   TEXT NOT NULL,
    UNIQUE (doc_kind, doc_id, model, prompt_sha256, feature)
);

-- ---------------------------------------------------------------- macro / regimes
CREATE TABLE IF NOT EXISTS factors_daily (
    f_date TEXT PRIMARY KEY,
    mkt_rf REAL, smb REAL, hml REAL, rmw REAL, cma REAL, mom REAL, rf REAL,
    source TEXT NOT NULL, ingested_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regime_daily (
    r_date          TEXT PRIMARY KEY,
    vix_close       REAL,
    spy_close       REAL,
    spy_above_200d  INTEGER,
    spy_ret_20d     REAL,
    spy_rv20        REAL,           -- annualized
    spy_rv20_pctile REAL,           -- percentile of rv20 over trailing 252d
    mkt_volume_ratio REAL,          -- SPY volume / 50d avg
    earnings_8k_count INTEGER,      -- count of 8-K item 2.02 that day (earnings-season proxy)
    earnings_season INTEGER,
    day_of_week     INTEGER,        -- 0=Mon
    computed_at     TEXT NOT NULL
);

-- ---------------------------------------------------------------- research governance
CREATE TABLE IF NOT EXISTS hypotheses (
    hyp_id        TEXT PRIMARY KEY,            -- H001
    title         TEXT NOT NULL,
    status        TEXT NOT NULL,               -- draft|registered|discovery|validation|failed|survived|frozen|forward|verdict_edge|verdict_no_edge|verdict_inconclusive|retired
    prereg_path   TEXT NOT NULL,
    prereg_sha256 TEXT,                        -- hash of the pre-registration file at registration
    git_commit    TEXT,
    registered_at TEXT,
    updated_at    TEXT NOT NULL
);

-- Every look at the data is logged here. Multiple-testing corrections read this table.
CREATE TABLE IF NOT EXISTS test_log (
    test_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    hyp_id      TEXT NOT NULL,
    split       TEXT NOT NULL,                 -- discovery | validation | holdout | forward
    variant     TEXT NOT NULL,                 -- which spec / parameter set
    run_at      TEXT NOT NULL,
    code_commit TEXT,
    n_events    INTEGER,
    n_days      INTEGER,
    metric      TEXT NOT NULL,
    estimate    REAL,
    t_stat      REAL,
    p_value     REAL,
    sharpe      REAL,
    notes       TEXT
);

CREATE TABLE IF NOT EXISTS strategies (
    strategy_id   TEXT PRIMARY KEY,            -- e.g. ctrl_random_v1, H002_v1
    hyp_id        TEXT,
    kind          TEXT NOT NULL,               -- control | candidate
    version       TEXT NOT NULL,
    params_json   TEXT NOT NULL,
    code_sha256   TEXT,
    frozen_at     TEXT,
    git_tag       TEXT,
    status        TEXT NOT NULL,               -- active | paused | retired
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
    account_id    TEXT PRIMARY KEY,
    strategy_id   TEXT NOT NULL REFERENCES strategies(strategy_id),
    broker        TEXT NOT NULL,               -- sim | alpaca_paper
    start_equity  REAL NOT NULL,
    created_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- signals (traded or not)
CREATE TABLE IF NOT EXISTS signals (
    signal_id     TEXT PRIMARY KEY,            -- deterministic: strategy|symbol|event_ref
    strategy_id   TEXT NOT NULL,
    symbol        TEXT NOT NULL,
    event_kind    TEXT,                        -- filing | news | random | schedule
    event_ref     TEXT,                        -- accession / news_id / seed
    info_ts       TEXT NOT NULL,               -- when the triggering info became public
    detected_ts   TEXT NOT NULL,               -- when our system saw it
    decision_date TEXT NOT NULL,               -- trading date of the decision (entry at that open)
    direction     INTEGER NOT NULL,            -- +1 long, -1 short
    strength      REAL,
    features_json TEXT,                        -- frozen snapshot of features used (pre-trade only)
    pre_beta      REAL,                        -- trailing beta vs SPY, estimated before info_ts
    pre_beta_n    INTEGER,
    pre_vol20     REAL,
    pre_ret_5d    REAL,                        -- run-up before the signal
    size_bucket   TEXT,
    adv20_usd     REAL,
    regime_date   TEXT,                        -- FK-ish into regime_daily (last date before decision)
    time_of_day   TEXT,                        -- pre_market | regular | after_hours | overnight
    traded        INTEGER NOT NULL DEFAULT 0,
    not_traded_reason TEXT,
    created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_signals_decision ON signals(decision_date);

-- Forward outcomes of every signal at fixed horizons, measured from the first tradable
-- open after info_ts. Computed by code, never by an LLM.
CREATE TABLE IF NOT EXISTS signal_outcomes (
    signal_id     TEXT NOT NULL REFERENCES signals(signal_id),
    horizon       TEXT NOT NULL,               -- gap,5m,30m,1h,4h,0d_close,1d,3d,5d,10d,20d,60d
    ret           REAL,                        -- raw return, signed by direction
    mkt_ret       REAL,                        -- SPY same window
    beta_adj_ret  REAL,                        -- ret - pre_beta * mkt_ret (signed)
    peer_ret      REAL,                        -- equal-weight matched peers same window
    peer_resid_ret REAL,                       -- ret - peer_ret (signed)
    n_peers       INTEGER,
    data_source   TEXT,
    computed_at   TEXT NOT NULL,
    PRIMARY KEY (signal_id, horizon)
);

-- Matched peers / controls per signal (same industry, similar liquidity and vol, no own
-- signal in the window). Doubles as the Tier 2 matched-control counterfactual.
CREATE TABLE IF NOT EXISTS signal_peers (
    signal_id   TEXT NOT NULL REFERENCES signals(signal_id),
    peer_symbol TEXT NOT NULL,
    match_distance REAL,
    method      TEXT NOT NULL,
    PRIMARY KEY (signal_id, peer_symbol)
);

-- ---------------------------------------------------------------- execution
CREATE TABLE IF NOT EXISTS orders (
    order_id      TEXT PRIMARY KEY,            -- our client_order_id
    account_id    TEXT NOT NULL REFERENCES accounts(account_id),
    signal_id     TEXT,
    trade_id      TEXT,
    symbol        TEXT NOT NULL,
    side          TEXT NOT NULL,               -- buy | sell
    intent        TEXT NOT NULL,               -- open | close
    qty           REAL NOT NULL,
    order_type    TEXT NOT NULL,               -- market
    tif           TEXT NOT NULL,               -- opg | cls | day
    decision_ts   TEXT NOT NULL,
    decision_px   REAL,                        -- reference price at decision (last close)
    trade_date    TEXT NOT NULL,               -- date it should execute
    broker_order_id TEXT,
    broker_status TEXT,
    broker_fill_px REAL,
    broker_fill_qty REAL,
    broker_filled_ts TEXT,
    sim_fill_px_raw REAL,                      -- the auction/open price used by the simulator
    sim_status    TEXT NOT NULL DEFAULT 'pending',  -- pending | filled | rejected | expired
    reject_reason TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_orders_pending ON orders(sim_status, trade_date);

CREATE TABLE IF NOT EXISTS trades (
    trade_id      TEXT PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES accounts(account_id),
    strategy_id   TEXT NOT NULL,
    signal_id     TEXT,
    symbol        TEXT NOT NULL,
    direction     INTEGER NOT NULL,
    qty           REAL NOT NULL,
    status        TEXT NOT NULL,               -- pending_entry | open | pending_exit | closed | cancelled
    entry_date    TEXT,
    entry_px_raw  REAL,
    planned_exit_date TEXT,
    exit_date     TEXT,
    exit_px_raw   REAL,
    exit_reason   TEXT,                        -- time | kill_switch | risk | delisted | manual
    gross_ret     REAL,
    cost_opt      REAL,                        -- round-trip cost, fraction of notional
    cost_pess     REAL,
    net_ret_opt   REAL,
    net_ret_pess  REAL,
    shortfall_delay  REAL,                     -- decision_px -> entry raw, signed
    shortfall_spread REAL,
    shortfall_impact REAL,
    borrow_cost   REAL,
    mae           REAL,                        -- max adverse excursion (fraction)
    mfe           REAL,                        -- max favorable excursion (fraction)
    broker_entry_px REAL,
    broker_exit_px  REAL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_trades_status ON trades(account_id, status);

CREATE TABLE IF NOT EXISTS equity_daily (
    account_id TEXT NOT NULL,
    e_date     TEXT NOT NULL,
    cost_model TEXT NOT NULL,                  -- opt | pess
    equity     REAL NOT NULL,
    cash       REAL NOT NULL,
    gross_exposure REAL NOT NULL,
    n_open     INTEGER NOT NULL,
    PRIMARY KEY (account_id, e_date, cost_model)
);

CREATE TABLE IF NOT EXISTS risk_events (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ts        TEXT NOT NULL,
    account_id TEXT,
    kind      TEXT NOT NULL,                   -- kill_switch | daily_loss | stale_data | limit_block
    detail    TEXT
);

-- ---------------------------------------------------------------- hindsight (never a feature)
CREATE TABLE IF NOT EXISTS hs_trade_reviews (
    trade_id     TEXT NOT NULL,
    review_date  TEXT NOT NULL,
    tag          TEXT NOT NULL,                -- market_driven|sector_driven|signal_consistent|cost_driven|execution_problem|unexplained
    noise        INTEGER,                      -- 1 if |move| < noise threshold by construction
    vol_rel_move REAL,                         -- |residual move| / (vol20 * sqrt(days))
    comment      TEXT,
    reviewer     TEXT NOT NULL,                -- code | claude:<model>
    created_at   TEXT NOT NULL,
    PRIMARY KEY (trade_id, review_date, reviewer)
);

CREATE TABLE IF NOT EXISTS hs_journal (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    j_date    TEXT NOT NULL,
    kind      TEXT NOT NULL,                   -- daily | weekly | verdict | decision
    path      TEXT,
    summary   TEXT,
    author    TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- ---------------------------------------------------------------- operations
CREATE TABLE IF NOT EXISTS job_runs (
    run_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    job        TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status     TEXT NOT NULL,                  -- running | ok | error | skipped
    rows_written INTEGER,
    detail     TEXT
);
CREATE INDEX IF NOT EXISTS ix_job_runs_job ON job_runs(job, started_at);

CREATE TABLE IF NOT EXISTS data_gaps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    detected_at TEXT NOT NULL,
    source     TEXT NOT NULL,
    gap_start  TEXT,
    gap_end    TEXT,
    detail     TEXT,
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS usage_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    u_date    TEXT NOT NULL,
    job       TEXT NOT NULL,
    surface   TEXT NOT NULL,                   -- claude_code_routine | api | local
    approx_minutes REAL,
    approx_tokens  INTEGER,
    usd_cost  REAL,
    notes     TEXT
);
