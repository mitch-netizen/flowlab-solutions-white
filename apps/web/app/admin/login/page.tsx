import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PLATFORM_SESSION_COOKIE, signPlatformSession, verifyPassword } from "@flowlab/auth";
import { findPlatformUser } from "@flowlab/db";

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await findPlatformUser(email);

  if (!user) {
    redirect("/admin/login?error=invalid");
  }

  const ok = await verifyPassword(password, user.passwordHash);

  if (!ok) {
    redirect("/admin/login?error=invalid");
  }

  const token = signPlatformSession({
    sub: user.id,
    email: user.email,
    role: user.role
  });

  const store = await cookies();
  store.set(PLATFORM_SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  redirect("/admin");
}

export default function PlatformLoginPage() {
  return (
    <main className="shell">
      <section className="hero" style={{ gridTemplateColumns: "0.9fr 1.1fr" }}>
        <div className="panel">
          <div className="pill">Superadmin access</div>
          <h1>Manage tenants, billing, health, and platform settings.</h1>
          <p className="muted">Demo login after seed: `admin@flowlabsolutions.com.au` / `FlowLab123!`</p>
        </div>
        <form action={login} className="hero-card form-grid">
          <label className="label">
            Email
            <input className="input" name="email" type="email" defaultValue="admin@flowlabsolutions.com.au" required />
          </label>
          <label className="label">
            Password
            <input className="input" name="password" type="password" defaultValue="FlowLab123!" required />
          </label>
          <button type="submit" className="cta">
            Open superadmin
          </button>
        </form>
      </section>
    </main>
  );
}
