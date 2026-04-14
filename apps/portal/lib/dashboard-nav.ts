export type DashboardNavItem = {
  href: string;
  label: string;
  description?: string;
};

export type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

/**
 * Top-level sidebar sections. Each is a distinct "app" or product area.
 * The sidebar shows only these labels — drilling into pages happens via
 * the top tab bar on each screen.
 */
export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Home", description: "Today's briefing and priorities" }
    ]
  },
  {
    title: "CRM",
    items: [
      { href: "/dashboard/crm", label: "Customers", description: "Customer records and history" },
      { href: "/dashboard/retention", label: "Retention", description: "Reminders, reviews, and rebooking" }
    ]
  },
  {
    title: "Jobs",
    items: [
      { href: "/dashboard/jobs", label: "Job board", description: "All jobs by status" },
      { href: "/dashboard/scheduler", label: "Schedule", description: "Availability and route planning" },
      { href: "/dashboard/mobile", label: "Mobile app", description: "Field workflow and completion" }
    ]
  },
  {
    title: "Revenue",
    items: [
      { href: "/dashboard/quotes", label: "Quotes", description: "Draft, send, and win work" },
      { href: "/dashboard/agreements", label: "Agreements", description: "Templates and signatures" },
      { href: "/dashboard/invoices", label: "Invoices", description: "Billing via Xero" }
    ]
  },
  {
    title: "Setup",
    items: [
      { href: "/dashboard/automations", label: "Automations", description: "Built-in and advanced workflows" },
      { href: "/dashboard/integrations", label: "Integrations", description: "Xero, Brevo, DocuSeal, and more" },
      { href: "/dashboard/settings", label: "Settings", description: "Business profile and pricing" },
      { href: "/dashboard/system-health", label: "System health", description: "Automation queues and alerts" },
      { href: "/dashboard/onboarding", label: "Onboarding", description: "Finish setup and go live" },
      { href: "/dashboard/upgrade", label: "Upgrade", description: "Plans, limits, and trial status" }
    ]
  }
];

export const dashboardUtilityLinks: DashboardNavItem[] = [
  { href: "/enquiry", label: "Customer enquiry link", description: "Open your public intake page" }
];

/**
 * Tab bars shown at the top of each app section page.
 * These give the operator quick access to related screens without
 * going back to the sidebar.
 */
export const dashboardSectionTabs = {
  home: [
    { href: "/dashboard", label: "Today" }
  ],
  crm: [
    { href: "/dashboard/crm", label: "Customers" },
    { href: "/dashboard/retention", label: "Retention" }
  ],
  jobs: [
    { href: "/dashboard/jobs", label: "Job board" },
    { href: "/dashboard/scheduler", label: "Schedule" },
    { href: "/dashboard/mobile", label: "Mobile app" }
  ],
  revenue: [
    { href: "/dashboard/quotes", label: "Quotes" },
    { href: "/dashboard/agreements", label: "Agreements" },
    { href: "/dashboard/invoices", label: "Invoices" }
  ],
  setup: [
    { href: "/dashboard/automations", label: "Automations" },
    { href: "/dashboard/integrations", label: "Integrations" },
    { href: "/dashboard/settings", label: "Settings" },
    { href: "/dashboard/system-health", label: "System health" },
    { href: "/dashboard/onboarding", label: "Onboarding" },
    { href: "/dashboard/upgrade", label: "Upgrade" }
  ]
} satisfies Record<string, DashboardNavItem[]>;

export type DashboardSectionKey = keyof typeof dashboardSectionTabs;

export function isDashboardHrefActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
