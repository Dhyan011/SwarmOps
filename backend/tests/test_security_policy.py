from security_policy import evaluate_patch


def make_patch(path, old="old", new="new"):
    return f"--- a/{path}\n+++ b/{path}\n@@ -1 +1 @@\n-{old}\n+{new}\n"


def test_policy_allows_simple_non_sensitive_patch_but_marks_tests_unexecuted():
    result = evaluate_patch(make_patch("src/service.py", "return False", "return True"))
    assert result.state == "passed"
    assert result.tests_executed is False


def test_policy_rejects_protected_file_paths():
    result = evaluate_patch(make_patch(".env", "API_KEY=old", "API_KEY=new"))
    assert result.state == "rejected"
    assert "protected_path_modified" in result.findings


def test_policy_rejects_secret_like_additions():
    result = evaluate_patch(make_patch("src/config.py", "token = None", "token = 'ghp_" + "A" * 36 + "'"))
    assert result.state == "rejected"
    assert "possible_secret_added" in result.findings


def test_policy_requires_manual_review_for_sensitive_security_paths():
    result = evaluate_patch(make_patch("backend/auth.py", "return False", "return True"))
    assert result.state == "needs_manual_review"
    assert "security_sensitive_path_requires_manual_review" in result.findings


def test_policy_fails_closed_on_missing_or_malformed_patch():
    assert evaluate_patch("").state == "needs_manual_review"
    assert evaluate_patch("not a unified diff").state == "needs_manual_review"
