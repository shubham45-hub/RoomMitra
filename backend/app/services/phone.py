import re
from fastapi import HTTPException

def normalize_indian_phone(value: str) -> str:
    digits = re.sub(r"[\s().-]", "", value.strip())
    if digits.startswith("+91"):
        digits = digits[3:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise HTTPException(status_code=422, detail="Enter a valid Indian mobile number")
    return "+91" + digits
