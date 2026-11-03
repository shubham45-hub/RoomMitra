from abc import ABC, abstractmethod
import logging

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

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


class TwilioSmsOtpDelivery(OtpDelivery):
    def send(self, phone: str, code: str) -> None:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        message_body = settings.otp_sms_template.format(
            code=code,
            minutes=max(1, settings.otp_ttl_seconds // 60),
        )
        message_args = {
            "to": phone,
            "body": message_body,
        }
        if settings.twilio_messaging_service_sid:
            message_args["messaging_service_sid"] = settings.twilio_messaging_service_sid
        else:
            message_args["from_"] = settings.twilio_from_number

        try:
            client.messages.create(**message_args)
        except TwilioRestException as exc:
            # Do not log phone numbers, OTPs, credentials, or provider request bodies.
            logger.error("Twilio rejected OTP delivery (status=%s, code=%s)", exc.status, exc.code)
            raise RuntimeError("SMS provider rejected OTP delivery") from exc
        except Exception as exc:
            logger.error("Twilio OTP request failed (%s)", type(exc).__name__)
            raise RuntimeError("SMS provider request failed") from exc


def get_otp_delivery() -> OtpDelivery:
    if settings.app_env == "development":
        return LocalOtpDelivery()
    if settings.sms_provider == "twilio":
        return TwilioSmsOtpDelivery()
    raise RuntimeError("A production SMS provider is not configured")
