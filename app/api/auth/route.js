/**
 * Member sign-in with Agora's own email codes.
 *   GET    /api/auth                                   → { member } (null if signed out)
 *   POST   /api/auth { action:"email_start", email }
 *   POST   /api/auth { action:"email_confirm", email, code, name? }
 *   DELETE /api/auth                                   → sign out
 */
import { handler, json, readJson, clientIp, HttpError } from "../../../lib/server/http";
import { currentMember, publicMember, endSession } from "../../../lib/server/auth";
import { startEmail, confirmEmail } from "../../../lib/server/verification";
import { features, config } from "../../../lib/server/config";

export const dynamic = "force-dynamic";

export const GET = handler(async request => {
  const m = await currentMember(request);
  return json({
    member: publicMember(m),
    available: features.database() && features.secret(),
    devMode: config.devMode,
  });
});

export const POST = handler(async request => {
  const body = await readJson(request);
  if (body.action === "email_start") return json(await startEmail(body.email, clientIp(request)));
  if (body.action === "email_confirm") {
    const { member, cookie } = await confirmEmail(body.email, body.code, body.name);
    member.level = undefined;
    return json({ member: publicMember(member) }, 200, { "set-cookie": cookie });
  }
  throw new HttpError(400, "Unknown action");
});

export const DELETE = handler(async request => json({ member: null }, 200, { "set-cookie": await endSession(request) }));
