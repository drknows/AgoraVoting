/**
 * Verification steps 2 and 3 for a signed-in member.
 *   POST /api/verify { action:"phone_start", phone }
 *   POST /api/verify { action:"phone_confirm", phone, code }
 *   POST /api/verify { action:"identity_start" }            → { url } to Stripe's secure ID + selfie + SSN screens
 *   GET  /api/verify                                        → refreshes identity status after returning
 */
import { handler, json, readJson, clientIp, origin, HttpError } from "../../../lib/server/http";
import { requireMember, publicMember, levelOf } from "../../../lib/server/auth";
import { startPhone, confirmPhone, startIdentity, checkIdentity, devSimulateIdentity } from "../../../lib/server/verification";

export const dynamic = "force-dynamic";

const out = m => { m.level = levelOf(m); return json({ member: publicMember(m) }); };

export const GET = handler(async request => {
  const m = await requireMember(request, 1);
  return out(await checkIdentity(m));
});

export const POST = handler(async request => {
  const body = await readJson(request);
  const ip = clientIp(request);
  if (body.action === "phone_start") {
    const m = await requireMember(request, 1);
    return json(await startPhone(m, body.phone, ip));
  }
  if (body.action === "phone_confirm") {
    const m = await requireMember(request, 1);
    await confirmPhone(m, body.phone, body.code);
    return out(await requireMember(request, 1));
  }
  if (body.action === "identity_start") {
    const m = await requireMember(request, 2, "Identity verification");
    return json(await startIdentity(m, `${origin(request)}/?tab=register&identity=return`));
  }
  if (body.action === "identity_dev_simulate") {
    const m = await requireMember(request, 2, "Identity verification");
    return out(await devSimulateIdentity(m, body));
  }
  throw new HttpError(400, "Unknown action");
});
