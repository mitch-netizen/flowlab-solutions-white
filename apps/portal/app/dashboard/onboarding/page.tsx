import { getTenantDashboardSnapshot, getTenantSettingsSnapshot } from "@flowlab/db";
import { buildTenantUrl } from "@flowlab/contracts/server";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { requireTenantSession } from "../../../lib/session";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage() {
  const session = await requireTenantSession();
  const [snapshot, settings] = await Promise.all([
    getTenantDashboardSnapshot(session.tenantId),
    getTenantSettingsSnapshot(session.tenantId)
  ]);

  const currentStep = snapshot.tenant?.users[0]?.onboardingStep ?? 1;
  const isCompleted = snapshot.tenant?.users[0]?.onboardingCompleted ?? false;

  const tenantSlug = snapshot.tenant?.slug ?? "";
  const enquiryUrl =
    process.env.NODE_ENV === "development"
      ? `http://${tenantSlug}.localhost:3001/enquiry`
      : buildTenantUrl(tenantSlug, "/enquiry");

  return (
    <DashboardPageScaffold
        eyebrow="Setup"
        title="Finish your business setup"
        description="Three quick steps and you're ready to take bookings."
        section="setup"
      >
      <OnboardingWizard
        initialStep={currentStep}
        isCompleted={isCompleted}
        enquiryUrl={enquiryUrl}
        initialProfile={{
          businessName: settings.profile?.businessName ?? "",
          phone: settings.profile?.phone ?? "",
          serviceAreaSuburbs: settings.profile?.serviceAreaSuburbs ?? [],
          businessType: settings.profile?.businessType ?? "other"
        }}
      />
    </DashboardPageScaffold>
  );
}
