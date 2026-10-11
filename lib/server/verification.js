/**
 * Agora's verification process.
 *
 *  Step 1  Email     — Agora emails a 6-digit code; confirming it signs the member in.
 *  Step 2  Phone     — Agora texts a 6-digit code to the member's mobile number.
 *  Step 3  Identity  — government photo ID + live selfie + Social Security number,
 *                      checked by Stripe Identity inside Agora's flow.
 *
 * What Agora stores: encrypted email/phone/legal name, the verification result,
 * and keyed fingerprints used to stop duplicate accounts. What Agora never
 * stores: the SSN, ID document images, or the selfie.
 */
import { config, features } from "./config";
import { query, one, tx, requireRate } from "./db";
import { encrypt, fingerprint, randomCode, randomId, safeEqual } from "./crypto";
import { sendEmail, sendSms } from "./messaging";
import { audit } from "./audit";
import { HttpError, clean } from "./http";
import { createSession } from "./auth";

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/* ── shared code handling ───────────────────────────────────── */
async function issueCode(purpose, targetFp, memberId) {
  const code = randomCode(6);
  await query("update verification_codes set consumed_at=now() where purpose=$1 and target_fp=$2 and consumed_at is null", [purpose, targetFp]);
  await query(
    `insert into verification_codes(purpose, target_fp, member_id, code_fp, expires_at)
     values($1,$2,$3,$4, now() + interval '${CODE_MINUTES} minutes')`,
    [purpose, targetFp, memberId || null, fingerprint("code", `${purpose}|${targetFp}|${code}`)]
  );
  return code;
}

async function checkCode(purpose, targetFp, code, memberId = null) {
  const row = await one(
    `select * from verification_codes where purpose=$1 and target_fp=$2 and consumed_at is null
     ${memberId ? "and member_id=$3" : ""} order by created_at desc limit 1`,
    memberId ? [purpose, targetFp, memberId] : [purpose, targetFp]
  );
  if (!row || new Date(row.expires_at) < new Date()) throw new HttpError(400, "That code has expired. Request a new one.");
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "Too many wrong attempts. Request a new code.");
  const ok = safeEqual(row.code_fp, fingerprint("code", `${purpose}|${targetFp}|${String(code).trim()}`));
  if (!ok) {
    await query("update verification_codes set attempts=attempts+1 where id=$1", [row.id]);
    throw new HttpError(400, `Incorrect code. ${MAX_ATTEMPTS - row.attempts - 1} attempts left.`);
  }
  await query("update verification_codes set consumed_at=now() where id=$1", [row.id]);
}

/* ── Step 1: email (sign-in / create account) ───────────────── */
export function normalizeEmail(email) {
  const e = clean(email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) throw new HttpError(400, "Please enter a valid email address.");
  return e;
}

export async function startEmail(rawEmail, ip) {
  const email = normalizeEmail(rawEmail);
  const fp = fingerprint("email", email);
  await requireRate(`email:${fp}`, 5, 3600, "Too many codes requested for this email. Try again in an hour.");
  await requireRate(`email-ip:${ip}`, 20, 3600);
  const code = await issueCode("email", fp);
  const r = await sendEmail(email, `Your Agora code: ${code}`,
    `Your Agora verification code is ${code}\n\nIt expires in ${CODE_MINUTES} minutes. If you didn't request it, ignore this email.`);
  return { sent: true, ...(r.dev ? { devCode: code } : {}) };
}

export async function confirmEmail(rawEmail, code, displayName) {
  const email = normalizeEmail(rawEmail);
  const fp = fingerprint("email", email);
  await checkCode("email", fp, code);
  let member = await one("select * from members where email_fp=$1", [fp]);
  if (member?.disabled) throw new HttpError(403, "This account has been disabled. Contact Agora support.");
  if (!member) {
    member = await one(
      `insert into members(id, email_fp, email_enc, display_name, email_verified_at)
       values($1,$2,$3,$4, now()) returning *`,
      [randomId(), fp, encrypt(email), clean(displayName, 60) || null]
    );
    await audit("global", member.id, "MEMBER_CREATED", { level: 1 });
  } else {
    member = await one(
      "update members set email_verified_at=coalesce(email_verified_at, now()), display_name=coalesce(nullif($2,''), display_name), updated_at=now() where id=$1 returning *",
      [member.id, clean(displayName, 60)]
    );
  }
  return { member, cookie: await createSession(member.id) };
}

/* ── Step 2: mobile phone ───────────────────────────────────── */
export function normalizePhone(raw) {
  let d = String(raw || "").replace(/[^\d+]/g, "");
  if (!d.startsWith("+")) {
    d = d.replace(/\D/g, "");
    if (d.length === 10) d = "1" + d;
    d = "+" + d;
  }
  if (!/^\+[1-9]\d{9,14}$/.test(d)) throw new HttpError(400, "Please enter a valid mobile number, e.g. (555) 123-4567.");
  return d;
}

export async function startPhone(member, rawPhone, ip) {
  const phone = normalizePhone(rawPhone);
  const fp = fingerprint("phone", phone);
  const other = await one("select id from members where phone_fp=$1 and id<>$2", [fp, member.id]);
  if (other) throw new HttpError(409, "That phone number is already linked to another Agora account.");
  await requireRate(`phone:${fp}`, 4, 3600, "Too many codes sent to this number. Try again in an hour.");
  await requireRate(`phone-member:${member.id}`, 6, 3600);
  await requireRate(`phone-ip:${ip}`, 20, 3600);
  const code = await issueCode("phone", fp, member.id);
  const r = await sendSms(phone, `Agora code: ${code}. Expires in ${CODE_MINUTES} min. Don't share it.`);
  return { sent: true, last4: phone.slice(-4), ...(r.dev ? { devCode: code } : {}) };
}

export async function confirmPhone(member, rawPhone, code) {
  const phone = normalizePhone(rawPhone);
  const fp = fingerprint("phone", phone);
  await checkCode("phone", fp, code, member.id);
  try {
    await query(
      "update members set phone_fp=$2, phone_enc=$3, phone_last4=$4, phone_verified_at=now(), updated_at=now() where id=$1",
      [member.id, fp, encrypt(phone), phone.slice(-4)]
    );
  } catch (e) {
    if (e.code === "23505") throw new HttpError(409, "That phone number is already linked to another Agora account.");
    throw e;
  }
  await audit("global", member.id, "PHONE_VERIFIED", {});
}

/* ── Step 3: photo ID + selfie + SSN (Stripe Identity) ──────── */
async function stripe(method, path, params, key = config.stripeSecret, idempotencyKey) {
  const url = new URL(`https://api.stripe.com/v1/${path}`);
  const init = { method, headers: { authorization: `Bearer ${key}` } };
  if (idempotencyKey) init.headers["idempotency-key"] = idempotencyKey;
  if (method === "GET") params?.forEach(([k, v]) => url.searchParams.append(k, v));
  else {
    init.headers["content-type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(params).toString();
  }
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Stripe error", res.status, body?.error?.type, body?.error?.message);
    throw new HttpError(502, "The identity service returned an error. Please try again.");
  }
  return body;
}

export async function startIdentity(member, returnUrl) {
  if (!features.identity() && config.devMode) return { devSimulate: true };
  if (!features.identity())
    throw new HttpError(503, "Identity verification is not switched on yet. An administrator needs to connect Stripe Identity.");
  if (member.identity_status === "verified") return { alreadyVerified: true };
  if (member.identity_status === "duplicate")
    throw new HttpError(409, "This identity is already linked to another Agora account. Contact Agora support.");
  await requireRate(`identity:${member.id}`, 5, 86400, "Too many verification attempts today. Try again tomorrow.");

  // Reuse an unfinished session so failed attempts stay on one record.
  if (member.identity_session && ["pending", "needs_retry"].includes(member.identity_status)) {
    const s = await stripe("GET", `identity/verification_sessions/${member.identity_session}`, []);
    if (s.status === "requires_input" && s.url) return { url: s.url };
  }
  const s = await stripe("POST", "identity/verification_sessions", [
    ["type", "document"],
    ["options[document][require_matching_selfie]", "true"],
    ["options[document][require_live_capture]", "true"],
    ["options[document][require_id_number]", "true"],
    ["options[document][allowed_types][]", "driving_license"],
    ["options[document][allowed_types][]", "passport"],
    ["options[document][allowed_types][]", "id_card"],
    ["client_reference_id", member.id],
    ["metadata[agora_member]", member.id],
    ["return_url", returnUrl],
  ], config.stripeSecret, `agora-idv-${member.id}-${Math.floor(Date.now() / 600000)}`);
  await query(
    "update members set identity_status='pending', identity_provider='stripe', identity_session=$2, identity_error=null, updated_at=now() where id=$1",
    [member.id, s.id]
  );
  await audit("global", member.id, "IDENTITY_STARTED", { provider: "stripe" });
  return { url: s.url };
}

const normName = s => String(s || "").normalize("NFKD").replace(/[^\p{L}]/gu, "").toUpperCase();
const pad = n => String(n).padStart(2, "0");

export async function checkIdentity(member) {
  if (!member.identity_session || member.identity_status === "verified" || !features.identity()) return member;
  // Sensitive fields (date of birth, SSN) require the restricted key.
  const s = await stripe("GET", `identity/verification_sessions/${member.identity_session}`, [
    ["expand[]", "verified_outputs"],
    ["expand[]", "verified_outputs.dob"],
    ["expand[]", "verified_outputs.id_number"],
  ], config.stripeRestricted);

  if (s.status === "processing") {
    await query("update members set identity_status='processing', updated_at=now() where id=$1", [member.id]);
  } else if (s.status === "requires_input") {
    const reason = s.last_error?.reason || (s.last_error ? "Verification did not pass." : null);
    await query("update members set identity_status=$2, identity_error=$3, updated_at=now() where id=$1",
      [member.id, reason ? "needs_retry" : "pending", reason]);
  } else if (s.status === "canceled") {
    await query("update members set identity_status='none', identity_session=null, updated_at=now() where id=$1", [member.id]);
  } else if (s.status === "verified") {
    const v = s.verified_outputs || {};
    const dob = v.dob?.year ? `${v.dob.year}-${pad(v.dob.month)}-${pad(v.dob.day)}` : null;
    const ssn = v.id_number ? String(v.id_number).replace(/\D/g, "") : null;
    if (!ssn || !dob) {
      await query("update members set identity_status='needs_retry', identity_error=$2, updated_at=now() where id=$1",
        [member.id, "We couldn't confirm your Social Security number and date of birth. Please try again."]);
    } else {
      const ssnFp = fingerprint("ssn", ssn);
      const personKey = fingerprint("person", `${normName(v.last_name)}|${dob}`);
      const legalName = [v.first_name, v.last_name].filter(Boolean).join(" ");
      await tx(async c => {
        const dup = (await c.query("select id from members where ssn_fp=$1 and id<>$2", [ssnFp, member.id])).rows[0];
        if (dup) {
          await c.query("update members set identity_status='duplicate', identity_error=$2, updated_at=now() where id=$1",
            [member.id, "This identity is already linked to another Agora account."]);
          await audit("global", member.id, "IDENTITY_DUPLICATE", { otherAccount: dup.id }, c);
        } else {
          await c.query(
            `update members set identity_status='verified', identity_verified_at=now(), identity_error=null,
               legal_name_enc=$2, ssn_fp=$3, person_key=$4, home_state=$5, updated_at=now() where id=$1`,
            [member.id, encrypt(legalName), ssnFp, personKey, v.address?.state || null]
          );
          await audit("global", member.id, "IDENTITY_VERIFIED", { provider: "stripe", checks: ["document", "selfie", "ssn"] }, c);
        }
      });
    }
  }
  return one("select * from members where id=$1", [member.id]);
}

/** LOCAL TESTING ONLY (AGORA_DEV_MODE=1, never production): simulate a passed ID check. */
export async function devSimulateIdentity(member, { firstName, lastName, dob, ssn, state }) {
  if (!config.devMode) throw new HttpError(404, "Not found");
  const ssnFp = fingerprint("ssn", String(ssn).replace(/\D/g, ""));
  const dup = await one("select id from members where ssn_fp=$1 and id<>$2", [ssnFp, member.id]);
  if (dup) {
    await query("update members set identity_status='duplicate', identity_error=$2 where id=$1", [member.id, "This identity is already linked to another Agora account."]);
  } else {
    await query(
      `update members set identity_status='verified', identity_provider='dev-simulated', identity_verified_at=now(), identity_error=null,
         legal_name_enc=$2, ssn_fp=$3, person_key=$4, home_state=$5 where id=$1`,
      [member.id, encrypt(`${firstName} ${lastName}`), ssnFp, fingerprint("person", `${normName(lastName)}|${dob}`), state || null]
    );
    await audit("global", member.id, "IDENTITY_VERIFIED", { provider: "dev-simulated" });
  }
  return one("select * from members where id=$1", [member.id]);
}
