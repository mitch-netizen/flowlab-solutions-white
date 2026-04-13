export type DashboardNavItem = {
  href: string;
  label: string;
  description?: string;
};

export type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", description: "Business snapshot and momentum" },
      { href: "/dashboard/crm", label: "CRM", description: "Customers, history, and feedback" },
      { href: "/dashboard/scheduler", label: "Scheduler", description: "Availability, clashes, and routes" },
      { href: "/dashboard/mobile", label: "Mobile", description: "Field workflow and job completion" }
    ]
  },
  {
    title: "Revenue",
    items: [
      { href: "/dashboard/quotes", label: "Quotes", description: "Draft, send, and win work" },
      { href: "/dashboard/agreements", label: "Agreements", description: "Templates and signatures" },
      { href: "/dashboard/invoices", label: "Invoices", description: "Billing and payment status" }
    ]
  },
  {
    title: "Growth and Ops",
    items: [
      { href: "/dashboard/retention", label: "Retention", description: "Rebooking, reminders, and reviews" },
      { href: "/dashboard/integrations", label: "Integrations", description: "Connected services and OAuth" },
      { href: "/dashboard/system-health", label: "System health", description: "Automation queues and alerts" }
    ]
  },
  {
    title: "Setup",
    items: [
      { href: "/dashboard/settings", label: "Settings", description: "Business profile and pricing" },
      { href: "/dashboard/onboarding", label: "Onboarding", description: "Finish setup and go live" },
      { href: "/dashboard/upgrade", label: "Upgrade", description: "Plans, limits, and trial status" }
    ]
  }
];

export const dashboardUtilityLinks: DashboardNavItem[] = [
  { href: "/enquiry", label: "Customer enquiry", description: "Open your public intake page" }
];

export const dashboardSectionTabs = {
  workspace: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/crm", label: "CRM" },
    { href: "/dashboard/scheduler", label: "Scheduler" },
    { href: "/dashboard/mobile", label: "Mobile" }
  ],
  revenue: [
    { href: "/dashboard/quotes", label: "Quotes" },
    { href: "/dashboard/agreements", label: "Agreements" },
    { href: "/dashboard/invoices", label: "Invoices" }
  ],
  operations: [
    { href: "/dashboard/retention", label: "Retention" },
    { href: "/dashboard/integrations", label: "Integrations" },
    { href: "/dashboard/system-health", label: "System health" },
    { href: "/dashboard/settings", label: "Settings" }
  ],
  setup: [
    { href: "/dashboard/onboarding", label: "Onboarding" },
    { href: "/dashboard/upgrade", label: "Upgrade" },
    { href: "/dashboard/settings", label: "Settings" }
  ]
} satisfies Record<string, DashboardNavItem[]>;

export type DashboardSectionKey = keyof typeof dashboardSectionTabs;

export function isDashboardHrefActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
