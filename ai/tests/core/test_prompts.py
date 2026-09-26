import pytest
from pv_ai.core.citations import clean, extract_ids
from pv_ai.core.errors import AiServiceError
from pv_ai.core.jsonx import extract_json_object
from pv_ai.core.prompts import load_template, parse_template, render


@pytest.mark.parametrize("name", ["explain_node", "explain_error", "qa_answer", "change_summary"])
def test_real_v2_templates_load(name):
    system, user = load_template(name)
    assert system and user
    assert "{{" in user


def test_parse_and_render():
    system, user = parse_template("SYSTEM:\nBe brief.\n---\nUSER:\nHello {{name}}")
    assert system == "Be brief."
    assert render(user, {"name": "Ana"}) == "Hello Ana"
    with pytest.raises(AiServiceError) as e:
        render(user, {})
    assert e.value.code == "bad_template"


def test_citations_are_cleaned_like_the_desktop():
    ok, ghost = "[[node:function:a.py#is_valid]]", "[[node:function:x.py#ghost]]"
    text = f"Uses is_valid {ok} and ghost {ghost} twice {ok}."
    cleaned, cited = clean(text, {"function:a.py#is_valid": "is_valid"})
    assert cleaned == f"Uses is_valid {ok} and ghost twice {ok}."
    assert cited == [{"id": "function:a.py#is_valid", "name": "is_valid"}]
    assert extract_ids(text) == ["function:a.py#is_valid", "function:x.py#ghost"]


def test_json_is_found_inside_fences_and_text():
    assert extract_json_object('Sure:\n```json\n{"a": {"b": "}"}, "c": 2}\n```') == {
        "a": {"b": "}"},
        "c": 2,
    }
    assert extract_json_object("no json here") is None
    assert extract_json_object('{broken} then {"ok": true}') == {"ok": True}
