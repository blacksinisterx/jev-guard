from app.rules import check_hard_rules


def test_blocks_recursive_root_delete():
    verdict, reason = check_hard_rules("shell\nrm -rf / --no-preserve-root")
    assert verdict == "block"


def test_blocks_drop_table():
    verdict, _ = check_hard_rules("db_query\nDROP TABLE users;")
    assert verdict == "block"


def test_allows_read_only_ls():
    verdict, _ = check_hard_rules("ls -la")
    assert verdict == "allow"


def test_falls_through_for_unmatched_commands():
    assert check_hard_rules("shell\ngit push --force origin main") is None
