from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.exc import OperationalError

from dataline.sentry import maybe_init_sentry
from dataline.utils.posthog import posthog_capture


def make_operational_error() -> OperationalError:
    return OperationalError(
        "SELECT user.hide_data_results FROM user",
        {},
        Exception("no such column: user.hide_data_results"),
    )


@pytest.mark.asyncio
async def test_maybe_init_sentry_ignores_schema_mismatch() -> None:
    with patch("dataline.sentry.UserRepository.get_one_or_none", new=AsyncMock(side_effect=make_operational_error())):
        await maybe_init_sentry()


@pytest.mark.asyncio
async def test_posthog_capture_ignores_schema_mismatch() -> None:
    with patch("dataline.utils.posthog.UserRepository.get_one_or_none", new=AsyncMock(side_effect=make_operational_error())):
        await posthog_capture("dataline_started")
