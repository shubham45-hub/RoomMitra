import logging

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from app.config import settings

logger = logging.getLogger("roommitra.password_reset")


def send_password_reset_code(phone: str, code: str) -> None:
    if settings.app_env == "development":
        return
    if settings.sms_provider != "twilio":
        raise RuntimeError("A production SMS provider is not configured")

    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    message_args = {
        "to": phone,
        "body": settings.password_reset_sms_template.format(
            code=code,
            minutes=max(1, settings.password_reset_code_ttl_seconds // 60),
        ),
    }
    if settings.twilio_messaging_service_sid:
        message_args["messaging_service_sid"] = settings.twilio_messaging_service_sid
    else:
        message_args["from_"] = settings.twilio_from_number

    try:
        client.messages.create(**message_args)
    except TwilioRestException as exc:
        logger.error(
            "Twilio rejected password reset delivery (status=%s, code=%s)",
            exc.status,
            exc.code,
        )
        raise RuntimeError("SMS provider rejected password reset delivery") from exc
    except Exception as exc:
        logger.error("Twilio password reset request failed (%s)", type(exc).__name__)
        raise RuntimeError("SMS provider request failed") from exc
