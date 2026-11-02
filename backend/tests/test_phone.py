import pytest
from fastapi import HTTPException
from app.services.phone import normalize_indian_phone
@pytest.mark.parametrize("value", ["9876543210", "+91 98765 43210", "919876543210", "(98765) 43210"])
def test_normalize(value): assert normalize_indian_phone(value) == "+919876543210"
@pytest.mark.parametrize("value", ["1234567890", "987654321", "+1 4155551212", "0000000000"])
def test_reject_invalid(value):
    with pytest.raises(HTTPException): normalize_indian_phone(value)
