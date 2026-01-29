from app.utils.streaming import parse_range


def test_parse_range_full():
    result = parse_range("bytes=0-99", 200)
    assert result is not None
    assert result.start == 0
    assert result.end == 99
    assert result.length == 100


def test_parse_range_suffix():
    result = parse_range("bytes=-50", 200)
    assert result is not None
    assert result.start == 150
    assert result.end == 199
    assert result.length == 50


def test_parse_range_open_end():
    result = parse_range("bytes=20-", 100)
    assert result is not None
    assert result.start == 20
    assert result.end == 99
    assert result.length == 80


def test_parse_range_invalid():
    assert parse_range("bytes=300-400", 200) is None
