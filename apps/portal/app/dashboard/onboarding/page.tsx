import { getTenantDashboardSnapshot, getTenantIntegrationRecord, getTenantSettingsSnapshot } from "@flowlab/db";
import { buildTenantUrl } from "@flowlab/contracts/server";
import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { requireTenantSession } from "../../../lib/session";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage() {
  const session = await requireTenantSession();
  const [snapshot, settings, xeroRecord] = await Promise.all([
    getTenantDashboardSnapshot(session.tenantId),
    getTenantSettingsSnapshot(session.tenantId),
    getTenantIntegrationRecord(session.tenantId, "xero")
  ]);
  const xeroConnected = xeroRecord?.status === "connected";

  const currentUser = snapshot.tenant?.users.find((user) => user.id === session.sub) ?? null;
  const currentStep = currentUser?.onboardingStep ?? 1;
  const isCompleted = currentUser?.onboardingCompleted ?? false;

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
        xeroConnected={xeroConnected}
        initialProfile={{
          businessName: settings.profile?.businessName ?? "",
          phone: settings.profile?.phone ?? "",
          serviceAreaSuburbs: settings.profile?.serviceAreaSuburbs ?? [],
          businessType: settings.profile?.businessType ?? "other",
          serviceBaseAddress: settings.profile?.serviceBaseAddress ?? "",
          serviceBasePlaceId: settings.profile?.serviceBasePlaceId ?? "",
          serviceBaseLat: settings.profile?.serviceBaseLat ?? null,
          serviceBaseLng: settings.profile?.serviceBaseLng ?? null,
          serviceRadiusKm: settings.profile?.serviceRadiusKm ?? null
        }}
      />
    </DashboardPageScaffold>
  );
}
