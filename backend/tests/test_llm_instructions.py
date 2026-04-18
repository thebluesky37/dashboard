from unittest.mock import MagicMock


def test_custom_instructions_appended_to_system_prompt() -> None:
    from dataline.services.llm_flow.graph import QueryGraphService

    svc = QueryGraphService.__new__(QueryGraphService)
    svc.toolkit = MagicMock()
    svc.toolkit.dialect = "sqlite"
    messages = svc.get_prompt_messages("hello", [], extra_instructions="Always respond in Spanish.")
    system_content = messages[0].content
    assert "Always respond in Spanish." in system_content


def test_no_instructions_leaves_prompt_unchanged() -> None:
    from dataline.services.llm_flow.graph import QueryGraphService

    svc = QueryGraphService.__new__(QueryGraphService)
    svc.toolkit = MagicMock()
    svc.toolkit.dialect = "sqlite"
    messages_with = svc.get_prompt_messages("hello", [], extra_instructions=None)
    messages_without = svc.get_prompt_messages("hello", [])
    assert messages_with[0].content == messages_without[0].content
