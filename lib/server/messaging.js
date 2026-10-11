/**
 * Delivers Agora's verification codes. Agora creates and checks every code
 * itself; these services only carry the message.
 *   Email → Resend (resend.com)    Text → Twilio (twilio.com)
 * In local dev mode (AGORA_DEV_MODE=1, never in production) codes are
 * returned to the screen instead of being sent.
 */
import { config } from "./config";
import { HttpError } from "./http";

export async function sendEmail(to, subject, text) {
  if (config.resendKey && config.emailFrom) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${config.resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: config.emailFrom, to: [to], subject, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend error", res.status, body.slice(0, 300));
      throw new HttpError(502, "Could not send the email. Please try again shortly.");
    }
    return { sent: true };
  }
  if (config.devMode) return { sent: false, dev: true };
  throw new HttpError(503, "Email delivery is not set up yet (RESEND_API_KEY, EMAIL_FROM).");
}

export async function sendSms(to, body) {
  if (config.twilioSid && config.twilioToken && (config.twilioFrom || config.twilioMessagingService)) {
    const form = new URLSearchParams({ To: to, Body: body });
    if (config.twilioMessagingService) form.set("MessagingServiceSid", config.twilioMessagingService);
    else form.set("From", config.twilioFrom);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.twilioSid)}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: "Basic " + Buffer.from(`${config.twilioSid}:${config.twilioToken}`).toString("base64"),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Twilio error", res.status, err.code, err.message);
      if (err.code === 21211 || err.code === 21614) throw new HttpError(400, "That doesn't look like a valid mobile number.");
      throw new HttpError(502, "Could not send the text message. Please try again shortly.");
    }
    return { sent: true };
  }
  if (config.devMode) return { sent: false, dev: true };
  throw new HttpError(503, "Text-message delivery is not set up yet (Twilio).");
}
