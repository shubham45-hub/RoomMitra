from app.services.security import hash_password, verify_password


def test_password_hash_is_salted_and_verifies():
    first_hash = hash_password("correct horse battery staple")
    second_hash = hash_password("correct horse battery staple")

    assert first_hash != second_hash
    assert verify_password("correct horse battery staple", first_hash)
    assert not verify_password("incorrect password", first_hash)


def test_password_verification_rejects_missing_or_malformed_hash():
    assert not verify_password("password", None)
    assert not verify_password("password", "not-a-password-hash")
