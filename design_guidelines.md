# BudgetSync Field - Design Guidelines

## Design Approach

**Hybrid Approach**: Material Design foundation with construction management best practices from Procore and Fieldwire. This combines Google's robust mobile-first system with proven patterns from field management leaders, optimized for outdoor use and quick data entry.

**Design Principles**:
- Field-First: Large touch targets, high contrast for outdoor readability
- Glanceable Data: Critical metrics visible without scrolling
- Rapid Input: Minimize taps, prioritize speed over decoration
- Offline-Ready: Clear sync status, queue pending actions visibly

---

## Typography

**Font Stack**: Roboto (via Google Fonts CDN)
- Display/Headers: Roboto Medium, 24-32px
- Section Headers: Roboto Medium, 18-20px
- Body Text: Roboto Regular, 16px
- Data/Numbers: Roboto Mono, 16-18px (for budget figures, calculations)
- Labels/Captions: Roboto Regular, 14px
- Small Text/Metadata: Roboto Regular, 12px

**Hierarchy**:
- Budget amounts and key metrics: Roboto Mono Bold, 28-36px
- Page titles: Roboto Medium, 24px
- Card headers: Roboto Medium, 18px
- Form labels: Roboto Medium, 14px
- All text should have minimum 16px for field readability

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **4, 6, 8, 12, 16**
- Component padding: p-4 (mobile), p-6 (tablet+)
- Section spacing: space-y-6 or gap-6
- Card internal spacing: p-6
- Form field gaps: space-y-4
- Tight groupings: gap-2
- Generous sections: py-12 or py-16

**Grid System**:
- Mobile (base): Single column, full width with px-4 container padding
- Tablet (md:): 2-column grid for dashboard cards
- Desktop (lg:): 3-column grid for dashboard, 2-column for forms

**Container Strategy**:
- Dashboard: Full-width with max-w-7xl mx-auto
- Forms: max-w-2xl mx-auto for focused data entry
- Data tables: Full-width scrollable horizontally on mobile

---

## Component Library

### Navigation
**Bottom Navigation Bar (Mobile Primary)**:
- Fixed bottom bar with 4-5 main sections: Dashboard, Timesheets, Progress, Budget, More
- Icon + label format, 64px height
- Active state indicated with accent treatment

**Top App Bar**:
- 56px height, fixed position
- Project name/selector on left
- Sync status indicator, notifications, menu on right
- Breadcrumb for sub-pages

### Dashboard Components

**Metric Cards**:
- Elevated cards (shadow-md) with p-6 padding
- Large number display (36px) at top
- Label below (14px)
- Trend indicator (up/down arrow with percentage)
- Min-height to prevent layout shift
- Grid: grid-cols-2 md:grid-cols-3 gap-4

**Status Indicator Bars**:
- Horizontal progress bars showing budget vs. spent
- Height: h-2 with rounded-full
- Label above showing "72% of budget used"
- Breakdown segments for categories (labor, materials, etc.)

**Budget Overview Card**:
- Large featured card at top of dashboard
- Shows: Total Budget, Spent Today, Remaining, Projected Final
- Grid layout within card: 2x2 on mobile, 4x1 on desktop

**Daily Summary Timeline**:
- Vertical timeline showing last 7-14 days
- Each entry: Date, daily spend, key activities
- Compact spacing (gap-2 between items)

### Forms & Data Entry

**Timesheet Entry**:
- Employee selection dropdown (searchable on desktop)
- Hours input with number pad optimization
- Rate display (read-only, calculated)
- Quick-entry grid for crew (table format)
- Sticky "Save" button at bottom

**Progress Report Form**:
- Percentage slider with numerical input option
- Material usage: Item + Quantity + Unit fields in rows
- Photo upload button (camera icon, large touch target 48x48)
- Notes textarea with min-height of 120px
- Auto-save indicator

**Form Input Specifications**:
- Input height: h-12 (48px minimum for touch)
- Label spacing: mb-2
- Field spacing: space-y-4
- Error messages: text-sm, mt-1
- Helper text: text-sm below inputs

### Data Display

**Budget Breakdown Table**:
- Sticky header on scroll
- Columns: Category, Budgeted, Spent, Remaining, %
- Alternating row background for readability
- Right-align numerical columns
- Mobile: Horizontal scroll, minimum column width enforced

**Alert/Warning Cards**:
- Full-width banners for critical alerts
- Icon (48x48) on left
- Message and action button
- Dismissible with X on right
- Use when burn rate exceeds threshold

**Category Pills/Chips**:
- Rounded-full badges for labor, materials, equipment, subs
- px-3 py-1, text-sm
- Used in filters and category indicators

### Offline & Sync

**Sync Status Bar**:
- Top bar (40px height) when offline
- Shows "Offline - Data will sync when connected"
- Pending items count
- Manual sync trigger button

**Pending Items Queue**:
- List of unsynced entries
- Each item: timestamp, type, preview
- Retry button for failed items

---

## Icons

**Icon Library**: Material Icons (via CDN)
- Size standard: 24x24 for inline, 32x32 for primary actions
- Navigation icons: 28x28
- Use filled variants for active states, outlined for inactive

**Key Icons**:
- Dashboard: dashboard, analytics
- Timesheets: schedule, access_time
- Progress: trending_up, checklist
- Budget: account_balance, attach_money
- Camera: photo_camera
- Sync: sync, cloud_off
- Alert: warning, error
- Add: add_circle

---

## Images

**Dashboard Hero (Optional but Recommended)**:
- Subtle background pattern or construction-themed abstract
- Low opacity (15-20%) beneath metric cards
- Height: 200px on mobile, part of header area
- Purpose: Adds visual interest without compromising data readability

**Empty States**:
- Illustration when no data exists (e.g., no timesheets submitted yet)
- 200x200px centered, simple line art
- Descriptive text below

**Photo Attachments**:
- Thumbnail grid: 80x80px squares
- Expand to full-screen modal on tap
- Material delivery verification photos inline in progress reports

---

## Responsive Behavior

**Mobile (< 768px)**:
- Single column layouts
- Bottom navigation primary
- Stacked metric cards (grid-cols-2 maximum)
- Full-width forms
- Tables scroll horizontally
- Floating action button for quick entry (56x56, bottom-right)

**Tablet (768px - 1024px)**:
- 2-3 column dashboard grids
- Side drawer navigation option
- Forms remain centered, max-w-2xl

**Desktop (> 1024px)**:
- Persistent side navigation (240px width)
- 3-4 column dashboard
- Multi-column forms where logical
- Table views expand fully

---

## Accessibility & Field Usability

- **Touch Targets**: Minimum 48x48px for all interactive elements
- **Contrast**: Text must be readable in bright sunlight (prioritize dark text on light backgrounds)
- **Focus States**: Clear 2px outline on all interactive elements
- **Loading States**: Skeleton screens for data-heavy views
- **Error Prevention**: Confirmation dialogs for destructive actions
- **Auto-save**: Forms auto-save every 30 seconds, with visual indicator

---

## Special Considerations

**Offline-First Architecture**:
- Visual queue of pending syncs always visible
- Optimistic UI updates
- Clear failed vs. pending state indicators

**Quick Entry Patterns**:
- Floating action button (FAB) for new timesheet/report
- Pre-filled forms with yesterday's data as default
- Quick-select crew members from recent list

**Data Density**:
- Dashboard prioritizes at-a-glance metrics
- Drill-down available but not required
- Progressive disclosure: summary → details on tap