/**
 * Central configuration. Everything sensitive comes from environment
 * variables set in Vercel → Settings → Environment Variables.
 */
const env = process.env;

/** Finds the Postgres connection string, including names Vercel adds with a custom prefix
 *  (e.g. STORAGE_DATABASE_URL). Prefers the pooled connection. */
function findDatabaseUrl() {
  const direct = env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRES_PRISMA_URL;
  if (direct) return direct;
  const keys = Object.keys(env).filter(k => /(^|_)(DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL)$/.test(k) && /^postgres(ql)?:\/\//.test(env[k] || ""));
  return env[keys.find(k => !/UNPOOLED|NON_POOLING/.test(k)) || keys[0]] || "";
}
export function databaseVarName() {
  for (const k of ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]) if (env[k]) return k;
  return Object.keys(env).find(k => /(^|_)(DATABASE_URL|POSTGRES_URL)$/.test(k) && /^postgres/.test(env[k] || "")) || null;
}

export const config = {
  databaseUrl: findDatabaseUrl(),
  // One long random secret; encryption and fingerprint keys are derived from it.
  secret: env.AGORA_SECRET || "",
  adminPassword: env.ADMIN_PASSWORD || "",

  // Email codes (Resend) and text-message codes (Twilio). Agora creates and checks the codes itself.
  resendKey: env.RESEND_API_KEY || "",
  emailFrom: env.EMAIL_FROM || "",
  twilioSid: env.TWILIO_ACCOUNT_SID || "",
  twilioToken: env.TWILIO_AUTH_TOKEN || "",
  twilioFrom: env.TWILIO_FROM_NUMBER || "",
  twilioMessagingService: env.TWILIO_MESSAGING_SERVICE_SID || "",

  // Government ID + selfie + SSN checks (Stripe Identity).
  stripeSecret: env.STRIPE_SECRET_KEY || "",
  stripeRestricted: env.STRIPE_RESTRICTED_KEY || "",

  // Ballot-data imports for community polls.
  fecKey: env.NEXT_PUBLIC_FEC_API_KEY || env.FEC_API_KEY || "DEMO_KEY",
  fredKey: env.FRED_API_KEY || "",
  googleCivicKey: env.GOOGLE_CIVIC_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_FACTCHECK_API_KEY || "",

  // Local testing only: shows codes on screen instead of sending them. Never on in production.
  devMode: env.AGORA_DEV_MODE === "1" && env.VERCEL_ENV !== "production",
  production: env.VERCEL_ENV === "production" || (!env.VERCEL_ENV && env.NODE_ENV === "production" && env.AGORA_DEV_MODE !== "1"),
};

const real = v => !!v && !/^(your_|choose_|REPLACE)/.test(v);

export const features = {
  database: () => real(config.databaseUrl),
  secret: () => real(config.secret) && config.secret.length >= 32,
  admin: () => real(config.adminPassword) && config.adminPassword.length >= 12,
  email: () => (real(config.resendKey) && real(config.emailFrom)) || config.devMode,
  sms: () => (real(config.twilioSid) && real(config.twilioToken) && (real(config.twilioFrom) || real(config.twilioMessagingService))) || config.devMode,
  identity: () => real(config.stripeSecret) && real(config.stripeRestricted),
  googleCivic: () => real(config.googleCivicKey),
  fred: () => real(config.fredKey),
};

/** What's configured — shown to admins on the setup checklist. */
export function setupStatus() {
  return [
    { id: "database", label: "Database (Neon Postgres)", ok: features.database(), vars: ["DATABASE_URL"], help: "Vercel → Storage → Create Database → Neon (free) → connect to this project." },
    { id: "secret", label: "Agora secret key", ok: features.secret(), vars: ["AGORA_SECRET"], help: "A random string of 32+ characters. Protects encrypted data — never change or share it." },
    { id: "admin", label: "Admin password", ok: features.admin(), vars: ["ADMIN_PASSWORD"], help: "12+ characters. Used at /admin." },
    { id: "email", label: "Email codes", ok: features.email(), vars: ["RESEND_API_KEY", "EMAIL_FROM"], help: "resend.com (free tier). EMAIL_FROM like: Agora <verify@yourdomain.org>." },
    { id: "sms", label: "Text-message codes", ok: features.sms(), vars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"], help: "twilio.com. Pay per text." },
    { id: "identity", label: "Photo ID + selfie + SSN checks", ok: features.identity(), vars: ["STRIPE_SECRET_KEY", "STRIPE_RESTRICTED_KEY"], help: "stripe.com → Identity. Restricted key needs Identity read permissions incl. 'Recent Detailed Verification Results'." },
    { id: "fred", label: "U.S. state economic data (report cards)", ok: features.fred(), vars: ["FRED_API_KEY"], help: "fred.stlouisfed.org → My Account → API Keys (free). Optional." },
    { id: "cron", label: "Scheduled refresh (disclosures, report cards)", ok: !!process.env.CRON_SECRET, vars: ["CRON_SECRET"], help: "Any long random string. Vercel uses it to run the daily refresh." },
    { id: "civic", label: "Ballot measure & contest imports", ok: features.googleCivic(), vars: ["GOOGLE_CIVIC_API_KEY"], help: "Google Cloud → enable Civic Information API → API key. Optional." },
  ];
}
