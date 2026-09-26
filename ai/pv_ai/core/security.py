"""Only the server's gateways may call this service: every feature route needs the
internal token."""

import hmac

from fastapi import Header

from pv_ai.core.config import get_settings
from pv_ai.core.errors import AiServiceError


def require_internal(x_pv_internal_token: str | None = Header(default=None)) -> None:
    expected = get_settings().internal_token
    if (
        not expected
        or not x_pv_internal_token
        or not hmac.compare_digest(expected, x_pv_internal_token)
    ):
        raise AiServiceError(401, "internal_only", "Internal only")
