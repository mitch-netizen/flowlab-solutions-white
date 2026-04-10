import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@flowlab/auth";
import { consumeRateLimit, createTenantWithOwner } from "@flowlab/db";
import { buildTenantUrl, signupInputSchema, validateBotGuard } from "@flowlab/contracts/server";

async function createSignup(formData: FormData) {
  "use server";

  const headerStore = await headers();
  const ip = headerStore.get("x-real-ip") || headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const throttle = await consumeRateLimit({
    scope: "signup",
    key: `signup:${ip}`,
    limit: 5,
    windowMs: 1000 * 60 * 15,
    blockMs: 1000 * 60 * 30
  });

  if (!throttle.allowed) {
    redirect("/signup?error=rate_limited");
  }

  const parsed = signupInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect("/signup?error=invalid");
  }

  try {
    validateBotGuard(parsed.data);
  } catch {
    redirect("/signup?error=invalid");
  }

  // Create the Supabase Auth user first
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
    plan: parsed.data.plan
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
          <p className="muted">Create your tenant, owner login, and branded workspace in one step. The onboarding wizard handles the rest on first login.</p>
          <form action={createSignup} className="form-grid">
            <label className="label">
              Business name
              <input className="input" name="businessName" required />
            </label>
            <label className="label">
              Your name
              <input className="input" name="ownerName" required />
            </label>
            <label className="label">
              Email
              <input className="input" name="email" type="email" required />
            </label>
            <label className="label">
              Phone
              <input className="input" name="phone" />
            </label>
            <label className="label">
              Suburb
              <input className="input" name="suburb" />
            </label>
            <label className="label">
              Password
              <input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" />
            </label>
            <label className="label">
              Business type
              <select className="select" name="businessType" defaultValue="lawn_mowing">
                {["lawn_mowing", "cleaning", "pest_control", "gardening", "handyman", "pool_service", "other"].map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Plan
              <select className="select" name="plan" defaultValue="professional">
                {["starter", "professional", "growth"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <button className="cta" type="submit">
              Start free 14-day trial
            </button>
            <input type="hidden" name="formStartedAt" value={startedAt} />
            <input type="text" name="website" autoComplete="off" tabIndex={-1} style={{ position: "absolute", left: "-9999px", opacity: 0 }} />
          </form>
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
