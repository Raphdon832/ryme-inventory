# OAK University Redesign Plan

## 1. Design Philosophy
The "OAK University" design language focuses on clarity, approachability, and professionalism. It moves away from the stark contrast of the "Corporate Modern" theme to a softer, more inviting palette inspired by academic institutions and modern SaaS platforms.

### Key Characteristics:
-   **Soft UI**: Generous whitespace, rounded corners (16px), and diffused shadows create a sense of depth without harsh borders.
-   **Color Palette**:
    -   **Primary**: Royal Blue (`#1A73E8`) - Trustworthy, professional, and energetic.
    -   **Accent**: Amber/Orange (`#F59E0B`) - Used sparingly for calls to action and warnings.
    -   **Background**: Off-White (`#F8F9FA`) - Reduces eye strain compared to pure white.
    -   **Surface**: Pure White (`#FFFFFF`) - For cards and content areas.
-   **Typography**: `Inter` font family for high legibility at all sizes.

## 2. Implementation Details

### Global Styles (`index.css`)
-   **Variables**: Defined a comprehensive set of CSS variables for colors, spacing, shadows, and typography.
-   **Card Styling**: Updated `.card` and `.stat-widget` to have larger border-radius (`16px`) and softer shadows.
-   **Typography**: Adjusted font weights and sizes to establish a clear hierarchy.

### Layout (`Layout.jsx`)
-   **Header**: Added a global search bar with a pill-shaped design (`border-radius: 99px`).
-   **Navigation**: Replaced the hamburger menu with `FiMenu` and added a notification bell and user profile section.
-   **Sidebar**: Updated to use the new color palette, with a light blue background (`#EFF6FF`) for active states.

### Dashboard (`Dashboard.jsx`)
-   **Icons**: Switched to Feather Icons (`react-icons/fi`) for a lighter, more modern stroke look.
-   **Widgets**: Updated the "Quick Actions" and "Low Stock" sections to use the new card styles and button variants.

## 3. Next Steps
-   **Component Refinement**: Ensure all tables and forms in other pages (`Inventory`, `Orders`) inherit the new styles correctly.
-   **Responsive Tweaks**: Verify that the search bar and sidebar behave correctly on mobile devices.
-   **Accessibility**: Check color contrast ratios to ensure compliance with WCAG standards.
