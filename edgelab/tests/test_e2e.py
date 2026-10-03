from edgelab.e2e import run_fake_e2e


def test_phase0_gate_pipeline_end_to_end(tmp_path):
    res = run_fake_e2e(tmp_path, n_days=90)
    c = res["counts"]
    assert c["signals"] > 100 and c["trades"] > 100 and c["signal_outcomes"] > 500 and c["signal_peers"] > 0
    planted = res["signal_stats_5d"]["planted_101:filing_item_v1"]
    # positive control: the pipeline must find the effect we planted
    assert planted["mean_5d_peer_resid"] > 0.01 and planted["t"] > 2
    assert (tmp_path / "reports").exists()
