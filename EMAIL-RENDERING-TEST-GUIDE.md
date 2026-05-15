# Email Rendering Test Guide

This guide explains how to test email rendering across different email clients to ensure CTA buttons and layouts display correctly.

## Test Checklist

### Email Clients to Test

- [ ] Gmail (Web)
- [ ] Outlook (Web)
- [ ] Apple Mail (macOS)
- [ ] Outlook (Windows)
- [ ] iPhone Mail
- [ ] Android (Gmail app)
- [ ] Yahoo Mail
- [ ] Thunderbird

### Visual Elements to Verify

- [ ] **CTA Buttons** display with correct colors and are clickable
- [ ] **Button Variants**: Primary (#3B82F6), Success (#10B981), Danger (#EF4444), Secondary (#6B7280)
- [ ] **Text Alignment**: Left-aligned body text, centered action sections
- [ ] **Typography**: Headers bold, subtext grey, no text distortion
- [ ] **Images**: Logo and embedded images load correctly
- [ ] **Spacing**: Proper padding/margins between sections
- [ ] **Links**: All URLs resolve and are clickable
- [ ] **Dark Mode**: Readable in dark mode (if client supports it)

## Testing Methods

### 1. **Manual Testing (Recommended)**

Send test emails from your tenant portal:
1. Create a test invoice or job in your dashboard
2. Trigger an email notification manually
3. Check rendering in each email client
4. Verify all CTAs are clickable and track correctly

### 2. **Email Preview Tools**

**Recommended tools:**
- [Stripo](https://stripo.email/) - Free preview across 100+ clients
- [Mailmodo](https://www.mailmodo.com/features/email-previewer) - Quick multi-client preview
- [Litmus](https://www.litmus.com/) - Professional testing (paid)
- [Email on Acid](https://www.emailonacid.com/) - Comprehensive testing (paid)

**Steps:**
1. Export the email HTML from your email template
2. Paste into preview tool
3. Check rendering across multiple clients
4. Note any layout issues

### 3. **Testing CTA Tracking**

After clicking a CTA in a test email:
1. Verify you're redirected to the correct destination
2. Check that the click was logged in the tracking metrics
3. Confirm button label appears in `/api/track/metrics`

**Example check:**
```bash
# Fetch click metrics for the last 7 days
curl "https://[tenant].flowlabsolutions.au/api/track/metrics?tenantId=[id]&days=7"

# Response includes:
# - totalClicks: count of all CTA clicks
# - topButtons: most clicked button labels
# - topAutomations: most clicked automation types
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Buttons appear as text links | CSS not supported | Some clients strip CSS; use fallback link text |
| Colors don't display | Dark mode override | Test with light/dark mode preferences |
| Images don't load | Hot-linking blocked | Ensure images are from trusted CDN |
| Text is cut off | Width constraints | Set max-width on containers |
| Links don't work | Encoding issues | Ensure URLs are properly encoded |

## Email Template Review Checklist

Before deploying new templates:

- [ ] HTML validates with [W3C Validator](https://validator.w3.org/)
- [ ] All images have alt text
- [ ] Links are absolute URLs (not relative)
- [ ] Font sizes are 14px minimum for body text
- [ ] Button text is clear and action-oriented
- [ ] Unsubscribe link present (if customer-facing)
- [ ] Footer includes business contact info
- [ ] Tested in at least 3 different email clients
- [ ] Mobile responsive (tested on phone)

## Responsive Design Testing

### Mobile Testing (Important!)

Most email opens are on mobile devices. Test:

1. **Portrait & Landscape** on phones and tablets
2. **Button sizing**: Buttons should be at least 44x44px (touch-friendly)
3. **Text wrapping**: Ensure no horizontal scroll needed
4. **Images**: Scale down appropriately for small screens

**Test devices:**
- iPhone 12 (375px width)
- Android phone (360px width)
- Tablet (768px width)

### Tool: Mobile Preview

Use [Responsive Email](https://responsiveemail.com/) to test mobile rendering.

## Accessibility Checklist

- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Button colors not the only visual indicator (include text)
- [ ] Form inputs have labels
- [ ] Images have descriptive alt text
- [ ] Font size ≥ 14px for readability

## Tracking & Metrics

### View CTA Click Metrics

**Dashboard endpoint:**
```
GET /api/track/metrics?tenantId={id}&days={days}
```

**Response fields:**
- `totalClicks` — Total CTA clicks in period
- `topButtons` — Most-clicked button labels
- `topAutomations` — Most-engaged automation types
- `buttonBreakdown` — All buttons with click counts
- `automationTypeBreakdown` — All automation types with click counts

### Interpret Metrics

- **High click-through**: Button is visible and compelling
- **Low click-through**: Consider button color/text clarity
- **Unequal distribution**: Some CTAs more relevant than others
- **Track over time**: Compare week-to-week trends

## Best Practices

### Button Styling
- ✅ Use contrasting colors (success #10B981 for positive actions)
- ✅ Add padding (20px horizontal, 12px vertical minimum)
- ✅ Include clear action text ("Pay Now", "View Invoice")
- ❌ Don't use red for non-critical actions
- ❌ Don't make buttons too small (< 44px height)

### Copy & Content
- ✅ Action-oriented button labels
- ✅ Context before CTAs (why should they click?)
- ✅ Multiple CTA options where relevant
- ❌ Don't make all buttons look the same
- ❌ Don't use generic "Click Here" text

### Mobile Considerations
- ✅ Stack buttons vertically on mobile
- ✅ Full-width buttons on small screens
- ✅ Larger touch targets
- ❌ Don't rely on hover states (mobile has no hover)
- ❌ Don't use tables for layout (poor mobile rendering)

## Deployment Checklist

Before going live with a new email template:

1. **Review** — Team approval of design and copy
2. **Test** — Rendering in ≥3 email clients
3. **Track** — Verify click tracking is working
4. **Monitor** — Check metrics for first 100 sends
5. **Adjust** — Iterate on button placement/color if needed

## Support & Troubleshooting

### Email Not Received?
- Check spam folder
- Verify recipient email in database
- Check platform event logs for send errors

### Buttons Not Tracking?
- Verify tracking endpoint is live: `GET /api/track/click`
- Check that job ID is passed correctly
- Confirm `platformEvent` records being created

### Poor Click Rates?
- A/B test button colors/text
- Ensure CTAs are above the fold (visible without scrolling)
- Test with different email subjects (affects open rates)
- Verify mobile rendering (most opens are mobile)

## Resources

- [Email Design Standards](https://www.emailonacid.com/blog/article/email-client-css-support)
- [CAN-SPAM Compliance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide)
- [Accessible Email Design](https://www.campaignmonitor.com/blog/email/2022/01/the-importance-of-email-accessibility/)

---

**Last Updated:** May 2026  
**Maintained By:** FlowLab Solutions
