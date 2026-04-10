import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { consumeRateLimit, createTenantWithOwner } from "@flowlab/db";
import { buildTenantUrl, signupInputSchema, validateBotGuard } from "@flowlab/contracts/server";
import SignupForm from "./SignupForm";

async function createSignup(formData: FormData) {
  "use server";

  const headerStore = await headers();
  const ip =
    headerStore.get("x-real-ip") ||
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const throttle = await consumeRateLimit({
    scope: "signup",
    key: `signup:${ip}`,
    limit: 5,
    windowMs: 1000 * 60 * 15,
    blockMs: 1000 * 60 * 30,
  });

  if (!throttle.allowed) redirect("/signup?error=rate_limited");

  const parsed = signupInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/signup?error=invalid");

  try {
    validateBotGuard(parsed.data);
  } catch {
    redirect("/signup?error=invalid");
  }

  const captchaToken = formData.get("captchaToken")?.toString();
  if (!captchaToken) redirect("/signup?error=captcha");

  // Use the public anon client so Supabase verifies the Turnstile token server-side.
  // admin.createUser() bypasses captcha — signUp() enforces it.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      captchaToken,
      data: { scope: "tenant" },
    },
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
