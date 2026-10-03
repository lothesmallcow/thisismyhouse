import numpy as np

from edgelab.analytics import stats


def test_holm_and_bh():
    p = [0.001, 0.02, 0.04, 0.3]
    assert stats.holm(p, 0.05) == [True, False, False, False]
    assert stats.benjamini_hochberg(p, 0.10) == [True, True, True, False]


def test_power_roundtrip():
    n = stats.required_n(0.003, 0.05)
    assert abs(stats.min_detectable_effect(0.05, n) - 0.003) < 1e-4
    assert n > 2000   # 0.3% per trade with 5% noise needs thousands of trades: the forward test is underpowered


def test_deflated_sharpe_penalizes_trials():
    rng = np.random.default_rng(0)
    x = rng.normal(0.001, 0.01, 500)
    one = stats.deflated_sharpe(x, 1)
    many = stats.deflated_sharpe(x, 100)
    assert many < one


def test_ttest_noise_is_insignificant_on_average():
    rng = np.random.default_rng(1)
    ps = [stats.t_test_mean(rng.normal(0, 1, 100))["p"] for _ in range(400)]
    assert 0.02 < np.mean(np.array(ps) < 0.05) < 0.09   # false-positive rate ~5%: why we correct


def test_bootstrap_ci_contains_mean():
    rng = np.random.default_rng(2)
    x = rng.normal(0.01, 0.02, 300)
    lo, hi = stats.block_bootstrap_ci(x)
    assert lo < x.mean() < hi
