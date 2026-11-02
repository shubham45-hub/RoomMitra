from abc import ABC, abstractmethod
import logging
from app.config import settings
logger = logging.getLogger("roommitra.otp")
class OtpDelivery(ABC):
    @abstractmethod
    def send(self, phone: str, code: str) -> None: ...
class LocalOtpDelivery(OtpDelivery):
    def send(self, phone: str, code: str) -> None:
        if settings.app_env != "development":
            raise RuntimeError("Local OTP delivery is development-only")
        logger.info("Development OTP for %s: %s", phone, code)
class SmsOtpDelivery(OtpDelivery):
    def send(self, phone: str, code: str) -> None:
        raise NotImplementedError("Connect an SMS provider before enabling production SMS")
def get_otp_delivery() -> OtpDelivery:
    if settings.app_env == "development":
        return LocalOtpDelivery()
    return SmsOtpDelivery()
