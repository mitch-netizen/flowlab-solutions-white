import { getTenantDashboardSnapshot, getTenantSettingsSnapshot } from "@flowlab/db";
import { buildTenantUrl } from "@flowlab/contracts/server";
import DashboardPageHeader from "../../../components/dashboard-page-header";
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
    <div className="stack">
      <DashboardPageHeader
        eyebrow="Setup"
        title="Finish the setup that makes the portal feel like your business."
        description="Work through branding, pricing, services, and scheduling so the rest of the portal can operate with real defaults instead of placeholder logic."
        section="setup"
      />
      <OnboardingWizard
        initialStep={currentStep}
        isCompleted={isCompleted}
        enquiryUrl={enquiryUrl}
        tenantSlug={tenantSlug}
        initialProfile={{
          businessName: settings.profile?.businessName ?? "",
          tagline: settings.profile?.tagline ?? "",
          phone: settings.profile?.phone ?? "",
          email: settings.profile?.email ?? "",
          primaryColour: settings.profile?.primaryColour ?? "#3B82F6",
          secondaryColour: settings.profile?.secondaryColour ?? "#1E40AF",
          accentColour: settings.profile?.accentColour ?? "#84CC16",
          serviceAreaSuburbs: settings.profile?.serviceAreaSuburbs ?? [],
          businessType: settings.profile?.businessType ?? "other"
        }}
        initialPricing={
          settings.pricingRates[0]
            ? {
                label: settings.pricingRates[0].label,
                baseRatePerSquareM: settings.pricingRates[0].baseRatePerSquareM,
                overgrownRate: settings.pricingRates[0].overgrownRate,
                heavilyOvergrownRate: settings.pricingRates[0].heavilyOvergrownRate,
                hourlyRate: settings.pricingRates[0].hourlyRate,
                calloutFee: settings.pricingRates[0].calloutFee,
                minimumCharge: settings.pricingRates[0].minimumCharge ?? 0,
                gstEnabled: settings.pricingRates[0].gstEnabled
              }
            : null
        }
        initialServiceTemplates={settings.serviceTemplates.map((t) => ({
          serviceName: t.name,
          defaultPrice: t.defaultPrice ?? 0,
          defaultDuration: t.defaultDuration ?? 0
        }))}
        initialWorkSchedule={settings.workSchedule.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime
        }))}
      />
    </div>
  );
}
