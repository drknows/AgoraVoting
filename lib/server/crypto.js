/**
 * Encryption and fingerprints.
 *  - encrypt()/decrypt(): AES-256-GCM for personal data stored in the database
 *    (email, phone, legal name). Unreadable without AGORA_SECRET.
 *  - fingerprint(): keyed HMAC used to look things up or detect duplicates
 *    without storing the raw value (email lookup, phone, SSN, voter-roll match).
 */
import crypto from "node:crypto";
import { config, features } from "./config";
import { HttpError } from "./http";

const keys = new Map();
function key(purpose) {
  if (!features.secret()) throw new HttpError(503, "AGORA_SECRET is not set (32+ characters). See Admin → Setup.");
  if (!keys.has(purpose)) {
    keys.set(purpose, Buffer.from(crypto.hkdfSync("sha256", config.secret, "agora-v1", purpose, 32)));
  }
  return keys.get(purpose);
}

export function fingerprint(purpose, value) {
  return crypto.createHmac("sha256", key(`fp:${purpose}`)).update(String(value)).digest("hex");
}

export function encrypt(text) {
  if (text == null || text === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key("enc"), iv);
  const data = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(blob) {
  if (!blob) return null;
  try {
    const [v, iv, tag, data] = blob.split(".");
    if (v !== "v1") return null;
    const d = crypto.createDecipheriv("aes-256-gcm", key("enc"), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
  } catch { return null; }
}

export const sha256 = v => crypto.createHash("sha256").update(String(v)).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
export const randomId = () => crypto.randomUUID();
export function randomCode(digits = 6) {
  return String(crypto.randomInt(0, 10 ** digits)).padStart(digits, "0");
}
export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
