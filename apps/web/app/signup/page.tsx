import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@flowlab/auth";
import { consumeRateLimit, createTenantWithOwner } from "@flowlab/db";
import { buildTenantUrl, signupInputSchema, validateBotGuard } from "@flowlab/contracts/server";
import SignupForm from "./SignupForm";

/**
 * Validate a Cloudflare Turnstile token server-side.
 * Returns true if the token is genuine, false otherwise.
 *
 * We validate this ourselves (rather than passing it to Supabase's captchaToken
 * option) because Supabase's built-in CAPTCHA enforcement also blocks
 * signInWithPassword — which would break login for all users.
 * By validating here and using admin.createUser() we get full bot protection
 * on signup without touching the auth flow at all.
 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // No secret configured — skip in dev, fail in prod
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

async function createSignup(formData: FormData) {
  "use server";

  const headerStore = await headers();
  const ip =
    headerStore.get("x-real-ip") ||
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  // Rate limit
  const throttle = await consumeRateLimit({
    scope: "signup",
    key: `signup:${ip}`,
    limit: 5,
    windowMs: 1000 * 60 * 15,
    blockMs: 1000 * 60 * 30,
  });
  if (!throttle.allowed) redirect("/signup?error=rate_limited");

  // Input validation
  const parsed = signupInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/signup?error=invalid");

  // Honeypot + timing bot guard
  try {
    validateBotGuard(parsed.data);
  } catch {
    redirect("/signup?error=invalid");
  }

  // Turnstile CAPTCHA — validated here, not passed to Supabase
  const captchaToken = formData.get("captchaToken")?.toString();
  if (!captchaToken) redirect("/signup?error=captcha");

  const captchaOk = await verifyTurnstile(captchaToken, ip);
  if (!captchaOk) redirect("/signup?error=captcha");

  // Create Supabase Auth user via admin client (bypasses Supabase's own captcha
  // check — we've already validated the token above)
  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { scope: "tenant" },
  });

  if (authError || !authData.user) {
    redirect("/signup?error=auth");
  }

  const tenant = await createTenantWithOwner({
    businessName: parsed.data.businessName,
    ownerName: parsed.data.ownerName,
    email: parsed.data.email,
    authUserId: authData.user.id,
    phone: parsed.data.phone,
    suburb: parsed.data.suburb,
    businessType: parsed.data.businessType,
    plan: parsed.data.plan,
  });

  redirect(`${buildTenantUrl(tenant.slug, "/login")}?created=1`);
}

export default function SignupPage() {
  const startedAt = Date.now();

  return (
    <main className="shell">
      <section className="hero" style={{ gridTemplateColumns: "1fr 0.8fr" }}>
        <div className="hero-card">
          <div className="pill">Self-signup</div>
          <h1>Start a 14-day FlowLab trial.</h1>
          <p className="muted">
            Create your tenant, owner login, and branded workspace in one step.
            The onboarding wizard handles the rest on first login.
          </p>
          <SignupForm action={createSignup} startedAt={startedAt} />
        </div>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>What happens next</h2>
          <div className="grid">
            <div className="panel-soft">Your tenant, profile, and owner login are created instantly.</div>
            <div className="panel-soft">You land in the 6-step onboarding wizard tailored to your business type.</div>
            <div className="panel-soft">Quoting, scheduling, invoicing, and automations all unlock from one branded dashboard.</div>
          </div>
        </div>
      </section>
    </main>
  );
}
