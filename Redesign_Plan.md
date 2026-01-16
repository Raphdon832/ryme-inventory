# Dashboard Redesign Plan (Donezo Style)

## Goal
Redesign the "Ryme Inventory MGT" dashboard to match the "Donezo" UI specification. The new design emphasizes a modern, clean aesthetic with a white and deep green color palette, rounded corners, and a card-based layout.

## 1. Color Palette & Theming
**File:** `client/src/index.css`
- Update CSS variables in `:root` to match the Donezo palette.
- **Primary Green:** `#1a5d3a` (Active states, primary buttons, etc.)
- **Backgrounds:** 
  - Body: `#f4f5f7`
  - Cards: `#ffffff`
  - Sidebar: `#ffffff` (Note: Current sidebar is dark `#0A0A0A`, needs to change to white).
- **Text:**
  - Primary: `#1a1a1a`
  - Secondary/Grey: `#888888`

## 2. Sidebar Component
**Files:** `client/src/components/Sidebar.jsx`, `client/src/components/Sidebar.css`
- **Visuals:** Change background to white. Update text colors.
- **Menu Items:** update styling for active state (bold, dark green icon). 
- **New Section:** Add the "Promo Card" ("Download our Mobile App") at the bottom of the sidebar.
- **Updates:** Ensure the menu structure matches the existing app but with the new styling.
  - *Keep:* Dashboard, Inventory, Orders, Settings.
  - *Add (Visual placeholders if functionality missing):* Tasks, Calendar, Analytics, Team, Help. (We will stick to existing functionality but style it like the mock).

## 3. Layout & Header
**File:** `client/src/components/Layout.jsx`
- **Header:**
  - Add "Search task" bar with "⌘ F" visual.
  - Add Message and Notification icons.
  - Update User Profile section aesthetics (Avatar + Name + Email).
- **Structure:** Ensure the sidebar is fixed left and content area takes the rest.

## 4. Dashboard Page (Main Content)
**File:** `client/src/pages/Dashboard.jsx`
- **Header:** Title "Dashboard" + Subtitle "Plan, prioritize...". + "Add Project" / "Import Data" buttons.
- **Metrics Row (Top):**
  - **Total Items (was Projects):** Green card.
  - **Other Stats:** White cards for Total Orders, Total Revenue, etc.
  - *Mapping:*
    - Total Projects -> Total Products
    - Ended Projects -> Total Orders
    - Running/Pending -> (Map to Revenue/Profit or other relevant stats).
- **Analytics Row:**
  - **Bar Chart:** Style the existing `recharts` to match the rounded green bars in the design.
  - **Reminders/Recent Activity:** Create a card for this.
  - **Project List:** Create a list view for "Recent Orders" or "Top Products" to match the "Project" list design.
- **Bottom Row:**
  - **Team Section:** (Maybe list "Recent Customers" or "Low Stock Items" here as a proxy for Team members).
  - **Progress/Time Tracker:** Implement the visual "Time Tracker" card (can be static or functional).

## 5. Global CSS Updates
**File:** `client/src/index.css`
- Update global font to a Sans-serif (Inter/Roboto).
- Add utility classes for the new card styles, pills, buttons.

## Implementation Steps
1.  **Update CSS Variables:** Modify `index.css` with the new color palette.
2.  **Redesign Sidebar:** Update `Sidebar.jsx` and `Sidebar.css`.
3.  **Redesign Layout/Header:** Update `Layout.jsx` to match the top bar design.
4.  **Refactor Dashboard:** Rewrite the JSX in `Dashboard.jsx` to implement the grid layout (3 rows) and new card styles.
5.  **Charts:** Customize `recharts` components to match the visual style (colors, rounded bars).
