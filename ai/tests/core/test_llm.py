import pytest
from pv_ai.core.config import Settings
from pv_ai.core.errors import AiServiceError
from pv_ai.core.llm import (
    AnthropicProvider,
    FakeProvider,
    FallbackProvider,
    OpenAICompatProvider,
    collect_stream,
    provider_from_settings,
)


def test_fake_provider_answers_in_order_and_records():
    p = FakeProvider(["one", "two"])
    assert p.complete("s", [{"role": "user", "content": "a"}], 10).text == "one"
    assert p.complete("s", [], 10).text == "two"
    assert p.complete("s", [], 10).text == "two"  # the last answer repeats
    assert len(p.calls) == 3


def test_fake_stream_yields_chunks_of_the_answer():
    chunks = list(FakeProvider(["hello world!"]).stream("s", [], 10))
    assert len(chunks) >= 3
    assert "".join(chunks) == "hello world!"


def test_provider_picked_by_setting():
    assert isinstance(
        provider_from_settings(Settings(_env_file=None, provider="anthropic", api_key="k")),
        AnthropicProvider,
    )
    assert isinstance(
        provider_from_settings(Settings(_env_file=None, provider="openai", api_key="k")),
        OpenAICompatProvider,
    )
    both = provider_from_settings(
        Settings(_env_file=None, provider="anthropic", api_key="k", fallback_provider="openai")
    )
    assert isinstance(both, FallbackProvider)
    with pytest.raises(AiServiceError):
        provider_from_settings(Settings(_env_file=None, provider="nope"))


def test_fallback_uses_the_second_provider_after_a_provider_error():
    primary = FakeProvider(["x"], fail_with=AiServiceError(502, "provider_error", "down"))
    secondary = FakeProvider(["from the fallback"])
    assert FallbackProvider(primary, secondary).complete("s", [], 10).text == "from the fallback"


def test_fallback_does_not_hide_a_bad_api_key():
    primary = FakeProvider(["x"], fail_with=AiServiceError(502, "provider_auth", "bad key"))
    with pytest.raises(AiServiceError) as e:
        FallbackProvider(primary, FakeProvider(["y"])).complete("s", [], 10)
    assert e.value.code == "provider_auth"


def test_fallback_streams_from_the_second_provider_before_the_first_chunk():
    primary = FakeProvider(["x"], fail_with=AiServiceError(503, "provider_rate_limit", "busy"))
    assert (
        collect_stream(FallbackProvider(primary, FakeProvider(["streamed"])).stream("s", [], 10))
        == "streamed"
    )
