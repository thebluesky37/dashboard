from dataline.models.message.schema import MessageOptions


def test_message_options_default_secure_data_is_disabled() -> None:
    assert MessageOptions().secure_data is False
