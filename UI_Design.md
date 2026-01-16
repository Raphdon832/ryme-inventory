# UI Design Specification: Donezo Dashboard

## Overview
This document outlines the UI design for the "Donezo" project management dashboard. The interface features a clean, modern aesthetic with a focus on productivity, utilizing a card-based layout with a distinct green and white color palette.

## Color Palette
- **Primary Green**: `#1a5d3a` (Used for active states, primary buttons, "Total Projects" card, "Time Tracker" card background)
- **Secondary Green**: `#e8f5e9` or similar light green (Used for backgrounds, hover states, chart elements)
- **Text Dark**: `#1a1a1a` (Headings, primary text)
- **Text Grey**: `#888888` (Subtitles, secondary text, inactive menu items)
- **Background**: `#f4f5f7` (Main app background), `#ffffff` (Card background)
- **Accents**: 
  - Red (Stop button)
  - Yellow/Orange (Status badges)

## Typography
- **Font Family**: Sans-serif (likely Inter, Roboto, or SF Pro).
- **Weights**:
  - **Bold/Semibold**: Headings, Metric numbers, Active menu items.
  - **Regular**: Body text, Menu items.

## Layout Structure

### 1. Sidebar (Left Panel)
- **Width**: Fixed width (approx. 250px).
- **Background**: White (`#ffffff`).
- **Elements**:
  - **Logo**: "Donezo" with a stylistic green logo mark.
  - **Menu Section**:
    - **Dashboard** (Active state: Dark Green text/icon, bold).
    - **Tasks**: Includes a notification badge ("12+" in dark green pill).
    - **Calendar**
    - **Analytics**
    - **Team**
  - **General Section**:
    - **Settings**
    - **Help**
    - **Logout**
  - **Promo Card**: 
    - Dark card at the bottom.
    - Image/Graphic: Abstract green waves.
    - Text: "Download our Mobile App".
    - Subtext: "Get easy in another way".
    - Button: "Download" (Green).

### 2. Top Navigation Bar
- **Search Bar**: 
  - Rounded corners.
  - Placeholder: "Search task".
  - Shortcut hint: "⌘ F".
- **Actions**:
  - Message Icon.
  - Notification Bell Icon.
- **User Profile**:
  - Avatar image.
  - Name: "Totok Michael".
  - Email: "tmichael20@mail.com" (Grey text).

### 3. Main Content Area (Dashboard)

#### Header
- **Title**: "Dashboard" (H1).
- **Subtitle**: "Plan, prioritize, and accomplish your tasks with ease."
- **Action Buttons**:
  - **+ Add Project** (Solid Dark Green, Pill shape).
  - **Import Data** (White with black border, Pill shape).

#### Metrics Grid (Top Row)
- **Total Projects**: 
  - Background: Dark Green.
  - Text: White.
  - Value: "24".
  - Subtext: "Increased from last month".
- **Ended Projects**:
  - Background: White.
  - Value: "10".
- **Running Projects**:
  - Background: White.
  - Value: "12".
- **Pending Project**:
  - Background: White.
  - Value: "2".

#### Analytics & Tasks Row (Middle Row)
- **Project Analytics**:
  - Bar chart showing weekly activity (S M T W T F S).
  - Bars have rounded tops.
  - Mix of solid green and hatched pattern bars.
- **Reminders**:
  - Card Title: "Reminders".
  - Event: "Meeting with Arc Company".
  - Time: "02.00 pm - 04.00 pm".
  - Button: "Start Meeting" (Dark Green, Full width).
- **Project List**:
  - Card Title: "Project" with "+ New" button.
  - Items (List view with icons):
    - "Develop API Endpoints" (Blue icon).
    - "Onboarding Flow" (Green icon).
    - "Build Dashboard" (Green icon).
    - "Optimize Page Load" (Orange icon).
    - "Cross-Browser Testing" (Purple icon).

#### Progress & Team Row (Bottom Row)
- **Team Collaboration**:
  - Header with "+ Add Member" button.
  - List of users with Avatars, Names, Tasks, and Status Badges.
  - Statuses: "Completed" (Green text), "In Progress" (Yellow text), "Pending" (Red/Pink text).
- **Project Progress**:
  - Donut Chart: Large green segment showing completion.
  - Center Text: "41% Project Ended".
  - Legend: Completed, In Progress, Pending.
- **Time Tracker**:
  - Background: Dark Green with abstract 3D wave pattern.
  - Timer: "01:24:08" (Large white text).
  - Controls: Pause (White icon), Stop (Red icon).
