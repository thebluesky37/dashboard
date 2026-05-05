from rldashboard.utils.utils import generate_short_uuid


def test_generate_short_uuid() -> None:
    short_uuid = generate_short_uuid()
    assert len(short_uuid) == 8
    assert isinstance(short_uuid, str)


def test_generate_short_uuid_uniqueness() -> None:
    short_uuid = generate_short_uuid()
    short_uuid2 = generate_short_uuid()
    assert short_uuid != short_uuid2
