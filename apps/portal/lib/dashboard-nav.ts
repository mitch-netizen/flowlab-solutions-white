export type DashboardNavItem = {
  href: string;
  label: string;
  description?: string;
  external?: boolean;
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
    title: "Today",
    items: [
      { href: "/dashboard", label: "Dashboard", description: "What needs doing next" }
    ]
  },
  {
    title: "Leads",
    items: [
      { href: "/dashboard/crm", label: "Requests & customers", description: "New enquiries and customer records" },
      { href: "/dashboard/retention", label: "Follow-up", description: "Reviews, rebooking, and reminders" }
    ]
  },
  {
    title: "Quotes",
    items: [
      { href: "/dashboard/quotes", label: "Quotes", description: "Price, send, and win work" },
      { href: "/dashboard/agreements", label: "Approvals", description: "Signed quotes and service agreements" }
    ]
  },
  {
    title: "Jobs",
    items: [
      { href: "/dashboard/jobs", label: "Job board", description: "All work by status" },
      { href: "/dashboard/scheduler", label: "Schedule", description: "Tomorrow's run sheet and routes" },
      { href: "/dashboard/mobile", label: "Field app", description: "Mobile workflow for the tools" }
    ]
  },
  {
    title: "Money",
    items: [
      { href: "/dashboard/invoices", label: "Invoices", description: "Billing through your Xero account" }
    ]
  },
  {
    title: "Settings",
    items: [
      { href: "/dashboard/onboarding", label: "Setup checklist", description: "Finish the launch steps" },
      { href: "/dashboard/settings", label: "Business settings", description: "Profile, services, pricing, and domains" },
      { href: "/dashboard/integrations", label: "Connected apps", description: "Xero, Brevo, DocuSeal, and more" },
      { href: "/dashboard/automations", label: "Automations", description: "What FlowLab does in the background" },
      { href: "/dashboard/system-health", label: "Health & logs", description: "Failed jobs and automation alerts" },
      { href: "/dashboard/upgrade", label: "Plan & billing", description: "Plan limits and trial status" }
    ]
  }
];

export const dashboardUtilityLinks: DashboardNavItem[] = [
  { href: "/enquiry", label: "Customer enquiry link", description: "Open your public intake page", external: true },
  { href: "/dashboard/support", label: "Support", description: "Chat with the FlowLab team", external: false }
];

/**
 * Tab bars shown at the top of each app section page.
 * These give the operator quick access to related screens without
 * going back to the sidebar.
 */
export const dashboardSectionTabs = {
  home: [
    { href: "/dashboard", label: "Today" },
    { href: "/dashboard/actions", label: "Action Inbox" }
  ],
  crm: [
    { href: "/dashboard/crm", label: "Requests & customers" },
    { href: "/dashboard/retention", label: "Follow-up" }
  ],
  jobs: [
    { href: "/dashboard/jobs", label: "Jobs" },
    { href: "/dashboard/scheduler", label: "Schedule" },
    { href: "/dashboard/mobile", label: "Field app" }
  ],
  revenue: [
    { href: "/dashboard/quotes", label: "Quotes" },
    { href: "/dashboard/agreements", label: "Approvals" },
    { href: "/dashboard/invoices", label: "Invoices" }
  ],
  setup: [
    { href: "/dashboard/onboarding", label: "Setup checklist" },
    { href: "/dashboard/settings", label: "Business settings" },
    { href: "/dashboard/integrations", label: "Connected apps" },
    { href: "/dashboard/automations", label: "Automations" },
    { href: "/dashboard/system-health", label: "Health & logs" },
    { href: "/dashboard/upgrade", label: "Plan & billing" }
  ]
} satisfies Record<string, DashboardNavItem[]>;

export type DashboardSectionKey = keyof typeof dashboardSectionTabs;

export function isDashboardHrefActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
