"""One error shape for every response: {"error": {"code", "message"}} (R15)."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger("pv_ai.errors")


class AiServiceError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def error_body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AiServiceError)
    async def _service_error(_: Request, e: AiServiceError) -> JSONResponse:
        return JSONResponse(status_code=e.status, content=error_body(e.code, e.message))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, e: RequestValidationError) -> JSONResponse:
        first = e.errors()[0] if e.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", []))
        return JSONResponse(
            status_code=400,
            content=error_body(
                "validation_error", f"{where}: {first.get('msg', 'invalid request')}"
            ),
        )

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, e: Exception) -> JSONResponse:
        log.exception("unexpected error", exc_info=e)
        return JSONResponse(
            status_code=500, content=error_body("internal", "Internal server error")
        )
