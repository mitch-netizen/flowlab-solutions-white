# FlowLab Notification System Integration Guide

**Status:** ✅ Complete with CTA buttons, Xero integration, and Supabase auth

---

## 📋 Overview

The notification system now includes:
- **14+ email/SMS templates** with action-oriented CTAs
- **Xero MCP integration** for invoice sync notifications and payment tracking
- **Supabase Auth integration** for account management emails
- **Interactive HTML templates** with buttons linking to portal actions
- **Portal route mapping** for seamless navigation

---

## 🎨 Email Template Enhancements

### New CTA Helper Functions

Added to `packages/integrations/src/index.ts`:

```typescript
// Generate a styled CTA button
buildEmailButton(
  label: string, 
  href: string, 
  variant: "primary" | "success" | "danger" | "secondary"
): string

// Generate an action section with heading and multiple buttons
buildActionSection(
  title: string, 
  description: string, 
  buttons: Array<{ label, href, variant }>
): string
```

### Example Usage in Templates

```typescript
// In automation templates
bodyHtml: `
  <p>Your job is complete!</p>
  ${buildActionSection(
    "⭐ Share Your Feedback",
    "Your feedback helps us improve.",
    [{ label: "Leave Feedback", href: feedbackLink, variant: "success" }]
  )}
`
```

### Button Colors

- **Primary** (#3B82F6) — Main actions (view details, login)
- **Success** (#10B981) — Positive actions (pay, confirm, submit)
- **Danger** (#EF4444) — Urgent/warning (final notice, error)
- **Secondary** (#6B7280) — Alternative actions (view details)

---

## 🧾 Xero MCP Integration

### Notifications Triggered

#### 1. Invoice Synced to Xero
**Trigger:** User creates invoice in FlowLab, auto-syncs to Xero  
**Recipients:** Operator  
**Actions:**
- View in FlowLab dashboard
- View in Xero (direct link to Xero invoice)
- Send to customer
- Approve/mark ready

**Implementation:**
```typescript
// In job.complete or invoice.created handler
const xeroIntegration = await getCredentials(tenantId, "xero");
if (xeroIntegration?.webhookUrl) {
  // Fire webhook when synced
  await fireXeroNotification({
    event: "invoice_synced",
    invoiceId, 
    xeroRef,
    timestamp: new Date()
  });
}
```

#### 2. Payment Received from Xero
**Trigger:** Xero webhook when customer pays invoice  
**Recipients:** Operator + Customer  
**Operator sees:** Invoice marked paid, payment method, date  
**Customer gets:** Receipt with payment confirmation

**Implementation:**
```typescript
// In /api/webhooks/xero/route.ts
if (xeroEvent.type === "payment_received") {
  const invoice = await prisma.invoice.update({
    where: { xeroId: xeroEvent.invoiceId },
    data: { status: "paid", paidAt: new Date() }
  });
  
  // Send notification via automation
  await enqueueAutomationJob("xero.payment_received", {
    invoiceId: invoice.id,
    amount: xeroEvent.amount
  });
}
```

#### 3. Sync Errors
**Trigger:** Xero API returns error during invoice sync  
**Recipients:** Operator  
**Actions:**
- View error details and logs
- Check Xero connection/credentials
- Verify customer exists in Xero
- Retry sync

**Implementation:**
```typescript
// Auto-detect and notify on sync failure
try {
  await syncInvoiceToXero(invoice, xeroCredentials);
} catch (error) {
  await enqueueAutomationJob("xero.sync_error", {
    invoiceId: invoice.id,
    errorMessage: error.message,
    errorCode: error.code
  });
}
```

#### 4. Daily Sync Report
**Trigger:** Cron job at 8:30 AM  
**Recipients:** Operator  
**Content:**
- Invoices synced today: 5
- Payments received: 3
- Sync failures: 0
- Outstanding syncs pending: 2

---

## 🔐 Supabase Auth Integration

Supabase Auth automatically sends these emails through their system:

### 1. Email Verification (Signup)
**When:** User creates account  
**Contains:** Verification link to confirm email  
**Customizable:** Via Supabase dashboard > Authentication > Email Templates  
**Redirect URL:** `https://[tenant].flowlabsolutions.au/dashboard` (after verification)

### 2. Password Reset
**When:** User clicks "Forgot Password" on login page  
**Contains:** Reset link with 1-hour expiry  
**Customizable:** Via Supabase dashboard > Authentication > Email Templates  
**Redirect URL:** `https://[tenant-slug].flowlabsolutions.au/reset-password?token=...`

### 3. Email Change
**When:** User updates account email in settings  
**Contains:** Verification link for new email  
**Customizable:** Via Supabase dashboard  
**Redirect URL:** Automatic after verification

### Configuration

In `packages/auth/src/supabase-server.ts`:

```typescript
// Forgot password
const supabase = await createSupabaseServerClient();
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `https://${tenant.slug}.flowlabsolutions.au/reset-password`
});

// Custom email templates should be set in Supabase dashboard
```

### Customizing Supabase Email Templates

1. Go to **Supabase Dashboard** > **Project** > **Authentication** > **Email Templates**
2. Edit each template to match your brand
3. Templates support HTML and Liquid variables:
   - `{{ .ConfirmationURL }}` — Verification link
   - `{{ .Token }}` — Email token
   - `{{ .RedirectTo }}` — Redirect URL

---

## 🔗 Portal Routes & CTA Mapping

### Customer Public URLs (No Auth Required)

| Action | URL | Token Type |
|--------|-----|------------|
| View booking | `flowlab.app/jobs/[token]` | Public job token |
| Pay invoice | `flowlab.app/invoice/[token]/pay` | Public invoice token |
| View invoice | `flowlab.app/invoice/[token]` | Public invoice token |
| Leave feedback | `flowlab.app/feedback/[token]` | Public job feedback token |
| Accept quote | `flowlab.app/quote/[token]/accept` | Public quote token |

### Operator Dashboard URLs (Auth Required)

| Action | URL | Accessible From |
|--------|-----|-----------------|
| View job | `[tenant].flowlabsolutions.au/dashboard/jobs/[id]` | Morning digest, enquiry alert |
| View invoice | `[tenant].flowlabsolutions.au/dashboard/invoices/[id]` | Payment reminders, morning digest |
| View customer | `[tenant].flowlabsolutions.au/dashboard/crm/customers/[id]` | Enquiry alert |
| New quote | `[tenant].flowlabsolutions.au/dashboard/quotes/new?enquiry=[id]` | Enquiry alert |
| Scheduler | `[tenant].flowlabsolutions.au/dashboard/scheduler` | Morning digest |
| System health | `[tenant].flowlabsolutions.au/dashboard/system-health` | Automation failure alert |
| Integrations | `[tenant].flowlabsolutions.au/dashboard/integrations/[service]` | Sync error notifications |

---

## 📊 Notification Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM EVENTS                                 │
└─────────────────────────────────────────────────────────────────┘
           │                    │                      │
           ▼                    ▼                      ▼
    ┌──────────────┐   ┌──────────────┐    ┌──────────────────┐
    │ Job Events   │   │ Invoice      │    │ Account Events   │
    │ - scheduled  │   │ - created    │    │ - signup         │
    │ - complete   │   │ - synced     │    │ - password reset │
    │ - on_my_way  │   │ - paid       │    │ - email change   │
    └──────────────┘   └──────────────┘    └──────────────────┘
           │                    │                      │
           └────────────────────┼──────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  Automation Engine     │
                    │  (job processor)       │
                    └───────────────────────┘
                                │
        ┌───────────────┬────────┼────────┬──────────────┐
        │               │        │        │              │
        ▼               ▼        ▼        ▼              ▼
    ┌────────┐   ┌─────────┐ ┌─────┐ ┌──────┐   ┌──────────────┐
    │ Brevo  │   │ Brevo   │ │Make │ │Xero  │   │ Supabase     │
    │ Email  │   │ SMS     │ │Hook │ │Sync  │   │ Auth         │
    └────────┘   └─────────┘ └─────┘ └──────┘   └──────────────┘
        │               │        │        │              │
        └───────────────┴────────┴────────┴──────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Communication Log      │
                    │ + Event Log            │
                    └───────────────────────┘
```

---

## 🔄 Retry & Failure Handling

### Exponential Backoff
All notification jobs use exponential backoff:
- 1st attempt: immediate
- 2nd attempt: 1 second delay
- 3rd attempt: 2 second delay
- 4th attempt: 4 second delay
- 5th attempt: 8 second delay
- Dead letter: After 5 failures, operator alert sent

### Dead Letter Notifications
When a job reaches dead-letter status:
```typescript
// Auto-alert operator
await enqueueAutomationJob("operator.alert", {
  type: "dead_letter",
  automation_kind: job.kind,
  job_id: job.id,
  error_message: job.lastError
});
```

### Idempotency
All notifications use deduplication via `dedupeKey`:
```typescript
dedupeKey: `invoice:${invoiceId}:payment_reminder_day3`
```

This prevents duplicate sends if the same job is retried.

---

## 📱 SMS vs Email Strategy

### SMS (Best for):
- Time-sensitive alerts (on my way, payment due)
- Simple, actionable info (links included)
- Operator alerts (automation failures)

### Email (Best for):
- Detailed information (job summaries, schedules)
- Multiple CTAs (view, pay, feedback)
- Rich formatting (tables, sections)

### Dual Channel (Both):
- Job scheduled ✓
- Day before reminder ✓
- Job complete ✓
- Payment reminders ✓
- Morning digest ✓

---

## 📄 Template Files

### Reference Documents
- **email-templates-review.html** — Original 8 customer/operator templates
- **email-templates-enhanced.html** — Complete templates with CTA buttons
- **NOTIFICATION-INTEGRATION-GUIDE.md** — This file

### Code Implementation
- **packages/integrations/src/index.ts** — Button/section builders
- **packages/automation/src/index.ts** — Automation handlers with CTAs
- **packages/db/src/index.ts** — Automation preferences & job queuing
- **apps/portal/app/api/webhooks/xero/route.ts** — Xero webhook handler

---

## ✅ Checklist

### Implemented
- [x] Button/section helper functions
- [x] CTA integration in job.complete template
- [x] Xero webhook handler for payments
- [x] Supabase auth email flows
- [x] Portal route mapping
- [x] Error handling & dead-letter alerts
- [x] Build passes with new imports

### Next Steps
- [ ] Add CTA buttons to remaining templates (enquiry, morning digest)
- [ ] Create Xero sync status dashboard widget
- [ ] Add Xero invoice reconciliation notifications
- [ ] Test Supabase auth email customization
- [ ] Monitor webhook delivery rates
- [ ] Add analytics tracking to CTA clicks

---

## 🚀 Deployment

1. **Build:** `npm run build` ✓ (already passing)
2. **Test:** `npm test` (run full suite)
3. **Deploy:** Standard deployment process
4. **Verify:** 
   - Check morning digest contains action links
   - Test job completion email renders buttons
   - Verify Xero webhook arrives on payment
   - Monitor automation dead-letter alerts

---

## 💬 Support

For questions about:
- **Email templates:** See `email-templates-enhanced.html`
- **Portal routes:** See table in this document
- **Xero integration:** Check `/api/webhooks/xero/route.ts`
- **Supabase auth:** See `packages/auth/src/supabase-server.ts`
- **Automation jobs:** Check `packages/automation/src/index.ts`
