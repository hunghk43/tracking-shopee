# Requirements Document

## Introduction

This document captures the UI/UX upgrade requirements for an existing Vietnamese shipment-tracking PWA built with Next.js 15 App Router, React 19, Tailwind CSS v4, and Supabase. The app tracks parcels from GHN and SPX carriers and currently has a functional but visually plain dark theme.

The upgrade targets the presentation layer only — no API routes, database schema, business logic, or data structures will change. The goal is a modern, premium "Logistics Dashboard" aesthetic inspired by Linear, Vercel Dashboard, Stripe Dashboard, and Shopify Admin, while keeping every existing interaction intact and improving overall usability and accessibility.

---

## Glossary

- **App**: The shipment-tracking PWA (Next.js 15).
- **Dashboard**: The main page (`app/page.tsx`) showing stats, the tracking list, and the detail panel.
- **StatsBar**: The four stat-card row (Total / In Transit / Delivered / Cancelled+Returned).
- **TrackingCard**: A single row in the tracking list representing one parcel.
- **TrackingDetail**: The right-side (desktop) or full-screen (mobile) panel showing full parcel details and timeline.
- **Timeline**: The vertical history of shipment milestones inside TrackingDetail.
- **SpxProgressBar**: The horizontal milestone progress strip shown for SPX parcels.
- **StatusBadge**: The pill badge indicating parcel status.
- **QuickActionBar**: The set of icon-buttons (View, Edit Note, Refresh, Delete) that appear on TrackingCard hover/focus.
- **BulkToolbar**: The floating action bar that appears when one or more TrackingCards are selected via checkbox.
- **FilterBar**: The status-filter, carrier-filter, and date-range-filter controls above the tracking list.
- **SearchBar**: The text input used to search parcels by code, nickname, or status.
- **EmptyState**: The illustration + text + CTA block shown when the list has no items.
- **Skeleton**: Shimmer placeholder shown while data is loading.
- **Toast**: The ephemeral notification overlay in the top-right corner.
- **CronStatusBar**: The auto-refresh indicator in the header.
- **BottomNav**: Mobile-only bottom navigation bar.
- **DesignToken**: A CSS custom property encoding a colour, spacing, or typography value.
- **Late_Parcel**: A parcel that is not in a terminal state (delivered / cancelled / returned) and was created more than 5 days ago.
- **Glass_Effect**: A UI surface with a semi-transparent background and a `backdrop-filter: blur()` applied.

---

## Requirements

### Requirement 1: Design Token System

**User Story:** As a developer, I want a single authoritative set of colour, typography, and spacing tokens defined in CSS custom properties, so that every component uses a consistent visual language and future theme changes require editing only one place.

#### Acceptance Criteria

1. THE App SHALL expose the following colour tokens as CSS custom properties on `:root`:
   - `--color-bg` (`#0F172A`), `--color-surface` (`#1E293B`), `--color-card` (`#111827`), `--color-border` (`rgba(255,255,255,0.08)`).
   - `--color-primary` (`#F8FAFC`), `--color-secondary` (`#CBD5E1`), `--color-muted` (`#94A3B8`).
   - `--color-accent-blue` (`#3B82F6`), `--color-accent-green` (`#22C55E`), `--color-accent-yellow` (`#F59E0B`), `--color-accent-red` (`#EF4444`), `--color-accent-cyan` (`#06B6D4`).
2. THE App SHALL expose typography tokens: `--font-size-xs` (12px), `--font-size-sm` (14px), `--font-size-base` (16px), `--font-size-lg` (18px), `--font-size-xl` (20px), `--font-size-2xl` (24px).
3. THE App SHALL expose spacing/radius tokens: `--radius-sm` (8px), `--radius-md` (12px), `--radius-lg` (16px), `--radius-xl` (20px).
4. THE App SHALL expose shadow tokens: `--shadow-card`, `--shadow-panel`, `--shadow-modal` as `box-shadow` values suitable for dark backgrounds.
5. WHEN any component references a colour, font size, border-radius, or shadow value, THE App SHALL use the corresponding token rather than a hard-coded value.

---

### Requirement 2: Stats Cards (StatsBar)

**User Story:** As a user, I want the stats cards to look premium and informative, so that I can instantly grasp key metrics and navigate between filter views.

#### Acceptance Criteria

1. THE StatsBar SHALL render five stat cards: Total, In Transit, Delivered, Returned, and Cancelled — each showing an icon, numeric count, Vietnamese label, and a trend percentage badge (e.g. "+12% this week" derived from frontend calculation or static placeholder).
2. WHEN a stat card is in its default state, THE StatsBar SHALL apply a `var(--color-card)` background, `var(--color-border)` border, and `var(--shadow-card)` shadow.
3. WHEN the user hovers a stat card, THE StatsBar SHALL transition the card's border colour to the card's accent colour, increase `box-shadow` intensity, and apply a `scale(1.02)` transform within 200ms.
4. WHEN a stat card is active (its filter is selected), THE StatsBar SHALL visually distinguish it with a stronger border, a brighter background tint matching the accent colour, and a pulsing indicator dot.
5. THE StatsBar SHALL remain fully responsive: a 2-column grid on small screens and a 4-column grid (all four original filter cards) or 5-column grid on medium and larger screens.

---

### Requirement 3: Tracking List — Card Design

**User Story:** As a user, I want each parcel row to look like a well-structured card, so that I can scan codes, carriers, statuses, and notes at a glance.

#### Acceptance Criteria

1. THE TrackingCard SHALL display: tracking code (monospace font), carrier badge, StatusBadge, last status text, last status time, nickname/note (if present), and days-in-transit indicator.
2. WHEN the user hovers a TrackingCard on a pointer device, THE TrackingCard SHALL lift by 2px (`translateY(-2px)`), brighten its border to `var(--color-accent-blue)` at 40% opacity, and deepen its shadow — all within 200ms.
3. WHEN a TrackingCard is selected, THE TrackingCard SHALL display a left-edge blue accent bar (2px wide), a `var(--color-accent-blue)` border, and a tinted background (`blue-950/20`).
4. THE TrackingCard SHALL include a checkbox in the top-left corner, visible on hover or when at least one other card is already checked, enabling multi-select for bulk actions.
5. WHEN the TrackingCard belongs to a Late_Parcel, THE TrackingCard SHALL display a red left border, a warning icon badge in the top-right corner, and a `⚠ Trễ giao` text indicator in orange-red.

---

### Requirement 4: Quick Actions on TrackingCard

**User Story:** As a user, I want quick action buttons directly on the card, so that I can view details, edit notes, refresh, or delete without opening extra menus.

#### Acceptance Criteria

1. THE QuickActionBar SHALL contain four icon buttons: 👁 Xem chi tiết, ✏ Sửa ghi chú, 🔄 Làm mới, and 🗑 Xóa.
2. WHEN the user hovers a TrackingCard on a pointer device, THE QuickActionBar SHALL fade in (opacity 0 → 1) and slide up by 4px over 200ms.
3. WHEN the device has no hover capability (mobile), THE QuickActionBar SHALL be accessible via a long-press on the TrackingCard or displayed permanently in a compact form.
4. WHEN the user activates the 🗑 Xóa button in the QuickActionBar, THE App SHALL trigger the existing delete flow without requiring an additional confirmation dialog for single-item deletes.
5. WHEN the user activates the ✏ Sửa ghi chú button, THE TrackingCard SHALL expand inline to show an editable note input field.

---

### Requirement 5: SearchBar

**User Story:** As a user, I want a prominent, always-visible search bar, so that I can quickly find a parcel by tracking code, nickname, or status keyword.

#### Acceptance Criteria

1. THE SearchBar SHALL be visible at the top of the tracking list at all times (not hidden behind a toggle).
2. THE SearchBar SHALL contain a leading search icon and a Vietnamese placeholder text "Tìm mã vận đơn, ghi chú, trạng thái…".
3. WHEN the user types in the SearchBar, THE App SHALL filter the tracking list in real time with no perceptible delay (debounce ≤ 150ms).
4. WHEN the SearchBar has a non-empty value, THE SearchBar SHALL show a clear (×) button that resets the query when activated.
5. WHEN the search query returns zero results, THE App SHALL display the EmptyState component with a "no results" variant (see Requirement 13).

---

### Requirement 6: Filter and Sort Controls

**User Story:** As a user, I want filter and sort controls that are easy to use and reset, so that I can narrow down the list to what I care about.

#### Acceptance Criteria

1. THE FilterBar SHALL provide a status dropdown (Tất cả / Đang VC / Đã giao / Hủy·Hoàn), a carrier dropdown (Tất cả / GHN / SPX), and a date-range picker for `created_at`.
2. WHEN the user changes any filter, THE App SHALL update the tracking list immediately and show a count of filtered results.
3. WHEN at least one non-default filter is active, THE FilterBar SHALL display a "Xóa bộ lọc" (Reset Filters) button.
4. WHEN the user activates "Xóa bộ lọc", THE App SHALL reset all filter controls to their defaults simultaneously.
5. THE FilterBar SHALL be accessible via keyboard: all dropdowns and the date picker SHALL be operable with Tab, Enter/Space, and Escape.

---

### Requirement 7: Bulk Action Toolbar

**User Story:** As a user, I want a bulk action toolbar to appear when multiple parcels are selected, so that I can change status, delete, or export several parcels at once.

#### Acceptance Criteria

1. WHEN one or more TrackingCards are selected via checkbox, THE BulkToolbar SHALL slide up from the bottom of the viewport and remain fixed until all selections are cleared.
2. THE BulkToolbar SHALL display: selection count, a "Đổi trạng thái" button, a "Xóa đã chọn" button, and an "Xuất CSV" button.
3. WHEN the user activates "Xóa đã chọn", THE App SHALL prompt for confirmation (modal) before deleting.
4. WHEN the user activates "Xuất CSV", THE App SHALL generate a client-side CSV file containing tracking_code, carrier, last_status, last_status_time, and nickname for all selected items and trigger a browser download.
5. WHEN the user clears all selections (or deselects all checkboxes), THE BulkToolbar SHALL slide back down and disappear within 250ms.

---

### Requirement 8: Detail Panel Layout and Information

**User Story:** As a user, I want the detail panel to present all parcel information clearly and be easy to navigate on both desktop and mobile.

#### Acceptance Criteria

1. WHEN a TrackingCard is selected on desktop (≥ lg breakpoint), THE TrackingDetail SHALL appear as a sticky right-side panel occupying the remaining horizontal space without hiding the list.
2. WHEN a TrackingCard is selected on mobile (< lg breakpoint), THE TrackingDetail SHALL occupy the full screen and include a back button that returns to the list.
3. THE TrackingDetail SHALL display: tracking code in a styled "barcode-style" monospace block with a copy button, carrier, status badge, COD amount (if available in `order_info`), nickname with inline edit, and creation date.
4. WHEN the TrackingDetail opens for a previously un-fetched parcel, THE App SHALL automatically trigger the refresh/track action without requiring the user to press the Tra cứu button.
5. THE TrackingDetail SHALL render the SpxProgressBar (for SPX parcels) and the Timeline (for all parcels with history) using the upgraded styles defined in Requirements 9 and 10.

---

### Requirement 9: SPX Progress Bar Upgrade

**User Story:** As a user, I want the SPX milestone progress bar to be visually clear and animated, so that I can see delivery progress at a glance.

#### Acceptance Criteria

1. THE SpxProgressBar SHALL render the five delivery steps with circular step indicators connected by a gradient line.
2. WHEN a step is completed, THE SpxProgressBar SHALL fill its indicator with `var(--color-accent-green)` and display a checkmark (✓).
3. WHEN a step is the current active step, THE SpxProgressBar SHALL apply a pulse-ring animation (ring that expands and fades) around the indicator using `var(--color-accent-blue)`.
4. WHEN a step is pending, THE SpxProgressBar SHALL render its indicator in a muted grey (`var(--color-muted)`) without animation.
5. THE SpxProgressBar SHALL animate the connecting line fill from left to right over 500ms when first rendered, reaching the percentage corresponding to the current step.

---

### Requirement 10: Timeline Upgrade

**User Story:** As a user, I want the shipment timeline to be easy to read and visually engaging, so that I can follow the parcel's journey step by step.

#### Acceptance Criteria

1. THE Timeline SHALL render a vertical list of history events connected by a gradient line using `var(--color-accent-blue)` to `var(--color-surface)`.
2. WHEN a history event is the latest (most recent), THE Timeline SHALL style its node with a pulsing blue indicator and bold status text in `var(--color-accent-blue)`.
3. WHEN a history event is a completed past step, THE Timeline SHALL style its node with a filled green circle (✓) and normal-weight text in `var(--color-secondary)`.
4. WHEN a history event has a `reason` field, THE Timeline SHALL display the reason below the status text in `var(--color-accent-yellow)`.
5. WHEN the user hovers a timeline event, THE Timeline SHALL show a tooltip containing date, time, location, and note fields.

---

### Requirement 11: Late Parcel Alert

**User Story:** As a user, I want abnormal (late) parcels to be visually highlighted, so that I can identify orders that may need attention.

#### Acceptance Criteria

1. WHEN a Tracking record qualifies as a Late_Parcel (not delivered/cancelled/returned and `created_at` is more than 5 days ago), THE TrackingCard SHALL apply a red-tinted left border (`var(--color-accent-red)`), a `⚠` warning icon badge, and an orange-red "Trễ giao" text label.
2. WHEN the TrackingDetail is opened for a Late_Parcel, THE TrackingDetail SHALL show a prominent warning banner at the top of the body section with the text "⚠ Đơn hàng có thể bị trễ — đã [N] ngày chưa giao".
3. THE App SHALL NOT change any data, status flag, or API call solely because a parcel is classified as Late_Parcel; the classification is visual only.

---

### Requirement 12: Empty States

**User Story:** As a user, I want meaningful empty state screens instead of blank areas, so that I understand what to do next when there is nothing to show.

#### Acceptance Criteria

1. WHEN `stats.total === 0` and loading is complete, THE Dashboard SHALL display an EmptyState with an illustration (SVG or emoji), headline "Chưa có đơn nào", subtext, and a primary CTA button "➕ Thêm đơn đầu tiên".
2. WHEN the SearchBar or FilterBar produces zero results, THE Dashboard SHALL display an EmptyState with a "no results" illustration, the text "Không tìm thấy kết quả cho "[query]"", and a secondary CTA "Xóa bộ lọc".
3. WHEN the TrackingDetail is open but has not yet fetched result data, THE TrackingDetail SHALL display a contextual placeholder (not a blank area) indicating the user should press "Tra cứu".
4. THE EmptyState component SHALL be reusable, accepting props for illustration, headline, subtext, and an optional CTA button.

---

### Requirement 13: Skeleton Loading

**User Story:** As a user, I want shimmer skeleton placeholders during data loads, so that I perceive the app as fast and avoid disorienting blank screens.

#### Acceptance Criteria

1. WHEN `dataLoading` is true, THE Dashboard SHALL render skeleton TrackingCards (matching the real card's height and layout) with a shimmer animation.
2. WHEN `detailLoading` is true inside TrackingDetail, THE TrackingDetail SHALL render a skeleton layout matching the Info card, status block, and timeline sections with shimmer animation.
3. THE Skeleton animation SHALL use a moving gradient (left-to-right sweep) with a cycle duration between 1.2s and 1.8s, using `var(--color-surface)` and `var(--color-card)` as gradient stops.
4. THE App SHALL NOT render any static "Loading…" text strings while skeleton animations are active.

---

### Requirement 14: Responsive Layout

**User Story:** As a user, I want the app to work well on both desktop and mobile, so that I can track parcels from any device.

#### Acceptance Criteria

1. WHEN the viewport width is ≥ 1024px, THE Dashboard SHALL display the tracking list on the left and the TrackingDetail as a sticky right panel simultaneously.
2. WHEN the viewport width is < 1024px AND no tracking is selected, THE Dashboard SHALL display only the tracking list in full width.
3. WHEN the viewport width is < 1024px AND a tracking is selected, THE Dashboard SHALL display only the TrackingDetail in full width with a back button ("← Danh sách") at the top.
4. WHEN the viewport width is < 640px, THE Dashboard SHALL display the BottomNav with icon-labelled shortcuts: 📦 Đơn hàng, 🔍 Tra nhanh, ➕ Thêm, 🔔 Thông báo, ⚙ Cài đặt.
5. THE BottomNav SHALL be fixed to the bottom of the viewport, add padding-bottom to the scroll container so content is not obscured, and use `safe-area-inset-bottom` for notched devices.

---

### Requirement 15: Animations and Transitions

**User Story:** As a user, I want smooth, purposeful animations, so that the app feels polished and interactions feel responsive.

#### Acceptance Criteria

1. THE App SHALL apply all hover micro-interactions (scale, shadow, border colour) within 200–300ms using CSS `transition`.
2. WHEN the TrackingDetail panel opens, THE App SHALL animate it sliding in from the right on desktop (translateX 100% → 0) and sliding up from the bottom on mobile.
3. WHEN a modal opens (AddTrackingModal, DeleteConfirmModal, CronStatusBar modal), THE App SHALL animate it fading in and scaling up from 95% to 100%.
4. WHEN the BulkToolbar appears or disappears, THE App SHALL animate it sliding up/down over 250ms.
5. WHEN a new TrackingCard is added to the list, THE App SHALL animate its entry with a fade-in-and-slide-down over 200ms.
6. THE App SHALL respect the `prefers-reduced-motion` media query by disabling or simplifying all non-essential animations when set to `reduce`.

---

### Requirement 16: Auto-Refresh Indicator (CronStatusBar)

**User Story:** As a user, I want a clear visual indicator showing when data was last updated and when the next scan will occur, so that I know how fresh the information is.

#### Acceptance Criteria

1. THE CronStatusBar button SHALL display: a colour-coded status dot (green = healthy, orange = delayed), the active parcel count, and the countdown to the next scan.
2. WHEN the user clicks the CronStatusBar button, THE App SHALL open the status modal with: last scan time (relative), countdown progress bar, active count, and scan interval.
3. WHEN the system is healthy (`last_checked_at` within the last 8 minutes), THE CronStatusBar SHALL use green accent colours; WHEN delayed, THE CronStatusBar SHALL use orange accent colours.
4. THE countdown progress bar in the modal SHALL animate smoothly (updating every second) from 0% to 100% representing elapsed time within the scan interval.
5. THE CronStatusBar SHALL follow the design token system (colours, border-radius, typography) consistent with the rest of the upgraded UI.

---

### Requirement 17: Accessibility

**User Story:** As a user with accessibility needs, I want the app to be operable via keyboard and screen reader, so that I can use it regardless of input method or assistive technology.

#### Acceptance Criteria

1. THE App SHALL maintain a colour contrast ratio of at least 4.5:1 for all body text and 3:1 for large text and UI components, in compliance with WCAG 2.1 AA.
2. THE App SHALL provide visible focus indicators (outline or ring) on all interactive elements that meet WCAG focus visibility requirements.
3. THE App SHALL assign appropriate ARIA roles and labels to icon-only buttons, the SearchBar, filter dropdowns, stat cards, TrackingCard checkboxes, the BulkToolbar, and modal dialogs.
4. WHEN a modal dialog opens, THE App SHALL trap keyboard focus within the dialog and restore focus to the triggering element when the dialog closes.
5. WHEN the user navigates the tracking list via keyboard (Tab/Arrow keys), THE App SHALL maintain a logical focus order matching the visual order.
6. THE App SHALL provide tooltip text (via `title` or `aria-describedby`) for all icon-only actions (QuickActionBar buttons, CronStatusBar dot, StatusBadge).

---

### Requirement 18: Toast Notification Upgrade

**User Story:** As a user, I want toast notifications to look consistent with the premium design system, so that they integrate seamlessly with the rest of the UI.

#### Acceptance Criteria

1. THE Toast component SHALL use `var(--color-card)` backgrounds, design-token border colours (green / red / blue / yellow per type), and `var(--shadow-modal)` shadow.
2. THE Toast component SHALL support the four types: success, error, info, warning — each with a distinct left-border accent colour and icon.
3. WHEN a toast contains an action button (e.g. "↩ Hoàn tác"), THE Toast SHALL style it as a text-link in `var(--color-accent-blue)`.
4. WHEN a toast exits, THE Toast SHALL animate sliding out to the right over 300ms.
5. THE Toast container SHALL be positioned `fixed top-4 right-4` on desktop and `fixed bottom-4 left-4 right-4` on mobile to avoid overlapping the BottomNav.

---

### Requirement 19: Header Upgrade

**User Story:** As a user, I want the header to look polished and make efficient use of space, so that key actions and status information are always accessible.

#### Acceptance Criteria

1. THE Header SHALL use a Glass_Effect background: `var(--color-bg)` at 90% opacity with `backdrop-filter: blur(12px)`.
2. THE Header SHALL display the app logo/icon, the "Vận đơn" title, the carrier tags ("GHN · SPX"), the last-updated time, and the refresh spinner — all on a single row.
3. WHEN the viewport width is < 640px, THE Header SHALL collapse non-essential labels (carrier tags, last-updated text) to reduce height, keeping only the logo, CronStatusBar button, search icon, and add button visible.
4. THE Header user-menu dropdown SHALL use `var(--color-surface)` background, `var(--color-border)` border, and `var(--shadow-panel)` shadow with `var(--radius-lg)` border radius.
5. THE Header SHALL remain sticky at `z-index: 30` and add bottom padding on scroll so page content does not snap to the header edge.
