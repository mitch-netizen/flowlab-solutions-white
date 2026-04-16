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

  const portalUrl = buildTenantUrl(tenant.slug, "/login");

  // Register tenant subdomain with Vercel so SSL cert is provisioned automatically.
  // The wildcard CNAME in Cloudflare handles DNS; Vercel needs the individual domain
  // registered to issue a certificate for it.
  try {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const vercelPortalProjectId = process.env.VERCEL_PORTAL_PROJECT_ID;
    if (vercelToken && vercelTeamId && vercelPortalProjectId) {
      await fetch(
        `https://api.vercel.com/v10/projects/${vercelPortalProjectId}/domains?teamId=${vercelTeamId}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: `${tenant.slug}.flowlabsolutions.au` }),
        }
      );
    }
  } catch {
    // Non-fatal — DNS will still route, cert provisioning retries automatically
  }

  // Send welcome email using platform-level Brevo credentials
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL ?? "hello@flowlabsolutions.au";
    const fromName = process.env.BREVO_FROM_NAME ?? "FlowLab";

    if (apiKey) {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: parsed.data.email, name: parsed.data.ownerName }],
          subject: `Your FlowLab portal is ready — ${parsed.data.businessName}`,
          htmlContent: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem">
              <h2 style="margin:0 0 1rem">Welcome to FlowLab, ${parsed.data.ownerName}! 👋</h2>
              <p>Your <strong>${parsed.data.businessName}</strong> portal has been created and is being set up now.</p>
              <p>It will be ready within a few minutes at:</p>
              <p style="margin:1.5rem 0">
                <a href="${portalUrl}" style="background:#6366f1;color:#fff;padding:0.75rem 1.5rem;border-radius:0.5rem;text-decoration:none;font-weight:600">
                  Open my portal →
                </a>
              </p>
              <p style="color:#888;font-size:0.875rem">
                If the button doesn't work, copy this link into your browser:<br>
                <a href="${portalUrl}">${portalUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:2rem 0">
              <p style="color:#888;font-size:0.8rem">FlowLab Solutions · <a href="https://flowlabsolutions.au">flowlabsolutions.au</a></p>
            </div>
          `,
        }),
      });
    }
  } catch {
    // Non-fatal — portal is still created, email failure shouldn't block redirect
  }

  redirect(
    `/getting-started?slug=${encodeURIComponent(tenant.slug)}&name=${encodeURIComponent(parsed.data.businessName)}&email=${encodeURIComponent(parsed.data.email)}`
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Too many attempts. Please wait 30 minutes and try again.",
  invalid: "Please check your details and try again.",
  captcha: "Security check failed. Please refresh and try again.",
  auth: "Could not create your account. That email may already be registered.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const startedAt = Date.now();
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.") : null;

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
          {errorMessage && (
            <p style={{ color: "var(--color-danger, #ef4444)", background: "rgba(239,68,68,0.08)", padding: "0.75rem 1rem", borderRadius: "0.5rem", margin: "0 0 1rem", fontSize: "0.9rem" }}>
              {errorMessage}
            </p>
          )}
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
