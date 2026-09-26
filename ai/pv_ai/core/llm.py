"""LLM providers behind one small interface; features never talk to an SDK directly."""

import logging
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Protocol

from pv_ai.core.config import Settings, get_settings
from pv_ai.core.errors import AiServiceError

log = logging.getLogger("pv_ai.llm")


@dataclass
class LlmResult:
    text: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0


class LlmProvider(Protocol):
    def complete(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> LlmResult: ...

    def stream(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> Iterator[str]: ...


def _map_error(e: Exception) -> AiServiceError:
    name = type(e).__name__.lower()
    if "auth" in name or "permission" in name:
        return AiServiceError(502, "provider_auth", "The AI provider rejected the API key")
    if "ratelimit" in name:
        return AiServiceError(503, "provider_rate_limit", "The AI provider is busy (rate limit)")
    if "timeout" in name:
        return AiServiceError(504, "provider_timeout", "The AI provider did not answer in time")
    return AiServiceError(502, "provider_error", f"The AI provider failed: {e}")


class AnthropicProvider:
    def __init__(self, api_key: str, model: str, base_url: str = "", timeout_s: float = 60):
        import anthropic

        self.model = model
        self.client = anthropic.Anthropic(
            api_key=api_key or "missing", base_url=base_url or None, timeout=timeout_s
        )

    def complete(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> LlmResult:
        try:
            r = self.client.messages.create(
                model=self.model,
                system=system,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except Exception as e:  # SDK errors -> one error shape
            raise _map_error(e) from e
        text = "".join(getattr(b, "text", "") for b in r.content)
        return LlmResult(text, r.model, r.usage.input_tokens, r.usage.output_tokens)

    def stream(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> Iterator[str]:
        try:
            with self.client.messages.stream(
                model=self.model,
                system=system,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            ) as s:
                yield from s.text_stream
        except AiServiceError:
            raise
        except Exception as e:
            raise _map_error(e) from e


class OpenAICompatProvider:
    def __init__(self, api_key: str, model: str, base_url: str = "", timeout_s: float = 60):
        import openai

        self.model = model
        self.client = openai.OpenAI(
            base_url=base_url or None, api_key=api_key or "none", timeout=timeout_s
        )

    def _messages(self, system: str, messages: list[dict]) -> list[dict]:
        return [{"role": "system", "content": system}, *messages]

    def complete(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> LlmResult:
        try:
            r = self.client.chat.completions.create(
                model=self.model,
                messages=self._messages(system, messages),
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except Exception as e:
            raise _map_error(e) from e
        usage = r.usage
        return LlmResult(
            r.choices[0].message.content or "",
            r.model,
            getattr(usage, "prompt_tokens", 0),
            getattr(usage, "completion_tokens", 0),
        )

    def stream(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> Iterator[str]:
        try:
            for chunk in self.client.chat.completions.create(
                model=self.model,
                messages=self._messages(system, messages),
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            ):
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta
        except AiServiceError:
            raise
        except Exception as e:
            raise _map_error(e) from e


_FALLBACK_CODES = {"provider_error", "provider_rate_limit", "provider_timeout"}


class FallbackProvider:
    """Tries the primary provider; on provider errors, rate limits or timeouts,
    tries the secondary once."""

    def __init__(self, primary: LlmProvider, secondary: LlmProvider):
        self.primary = primary
        self.secondary = secondary

    def complete(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> LlmResult:
        try:
            return self.primary.complete(system, messages, max_tokens, temperature)
        except AiServiceError as e:
            if e.code not in _FALLBACK_CODES:
                raise
            log.warning("llm_fallback", extra={"reason": e.code})
            return self.secondary.complete(system, messages, max_tokens, temperature)

    def stream(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> Iterator[str]:
        started = False
        try:
            for chunk in self.primary.stream(system, messages, max_tokens, temperature):
                started = True
                yield chunk
        except AiServiceError as e:
            if started or e.code not in _FALLBACK_CODES:  # never mix two answers
                raise
            log.warning("llm_fallback", extra={"reason": e.code})
            yield from self.secondary.stream(system, messages, max_tokens, temperature)


@dataclass
class FakeProvider:
    """Answers with the given responses in order and records the calls.
    Used by every feature test."""

    responses: list[str]
    calls: list[dict] = field(default_factory=list)
    model: str = "fake-model"
    fail_with: AiServiceError | None = None

    def complete(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> LlmResult:
        self.calls.append({"system": system, "messages": messages, "max_tokens": max_tokens})
        if self.fail_with:
            raise self.fail_with
        text = self.responses[min(len(self.calls) - 1, len(self.responses) - 1)]
        return LlmResult(text, self.model, 10, len(text.split()))

    def stream(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float = 0.2
    ) -> Iterator[str]:
        text = self.complete(system, messages, max_tokens, temperature).text
        third = max(1, len(text) // 3)
        yield from (text[i : i + third] for i in range(0, len(text), third))


def collect_stream(chunks: Iterator[str]) -> str:
    return "".join(chunks)


def _make(kind: str, api_key: str, model: str, base_url: str, timeout_s: float) -> LlmProvider:
    if kind == "anthropic":
        return AnthropicProvider(api_key, model, base_url, timeout_s)
    if kind in ("openai", "openai_compat"):
        return OpenAICompatProvider(api_key, model, base_url, timeout_s)
    raise AiServiceError(500, "bad_config", f"unknown provider: {kind}")


def provider_from_settings(s: Settings) -> LlmProvider:
    primary = _make(s.provider, s.api_key, s.model, s.base_url, s.timeout_s)
    if not s.fallback_provider:
        return primary
    secondary = _make(
        s.fallback_provider,
        s.fallback_api_key,
        s.fallback_model or s.model,
        s.fallback_base_url,
        s.timeout_s,
    )
    return FallbackProvider(primary, secondary)


def get_provider() -> LlmProvider:
    """FastAPI dependency; tests replace it with app.dependency_overrides."""
    return provider_from_settings(get_settings())
