import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TENANT_SESSION_COOKIE, signTenantSession, verifyPassword } from "@flowlab/auth";
import { findTenantUser } from "@flowlab/db";
import { getCurrentTenantContext } from "../../lib/tenant";

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await findTenantUser(email);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?error=invalid");
  }

  const token = signTenantSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  });

  const store = await cookies();
  store.set(TENANT_SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  redirect("/dashboard");
}

export default async function TenantLoginPage() {
  const tenant = await getCurrentTenantContext();

  return (
    <main>
      <section className="hero-grid">
        <div className="surface">
          <div className="eyebrow">{tenant?.branding.businessName ?? "Tenant access"}</div>
          <h1>Operator dashboard login</h1>
          <p style={{ color: "#cbd5e1" }}>Demo login after seed: `owner@quinnysmowing.com.au` / `Quinny123!`</p>
        </div>
        <form action={login} className="surface form-grid">
          <label className="label">
            Email
            <input className="input" name="email" type="email" defaultValue="owner@quinnysmowing.com.au" required />
          </label>
          <label className="label">
            Password
            <input className="input" name="password" type="password" defaultValue="Quinny123!" required />
          </label>
          <button className="cta" type="submit">
            Open dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
