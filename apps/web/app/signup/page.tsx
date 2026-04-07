import { redirect } from "next/navigation";

import { createTenantWithOwner } from "@flowlab/db";

async function createSignup(formData: FormData) {
  "use server";

  const businessName = String(formData.get("businessName") ?? "");
  const ownerName = String(formData.get("ownerName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const suburb = String(formData.get("suburb") ?? "");
  const businessType = String(formData.get("businessType") ?? "other") as
    | "lawn_mowing"
    | "cleaning"
    | "pest_control"
    | "gardening"
    | "handyman"
    | "pool_service"
    | "other";
  const plan = String(formData.get("plan") ?? "professional") as "starter" | "professional" | "growth";

  await createTenantWithOwner({
    businessName,
    ownerName,
    email,
    password,
    phone,
    suburb,
    businessType,
    plan
  });

  redirect("/admin?created=1");
}

export default function SignupPage() {
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
              <input className="input" name="password" type="password" required minLength={8} />
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
