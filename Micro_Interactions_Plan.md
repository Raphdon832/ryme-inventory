# Micro-Interactions & Animations Plan

This document outlines the key buttons and interactive elements across the Ryme Inventory app that would benefit from micro-interactions and animations.

---

## Implementation Status

### ✅ Phase 1 - High Impact (COMPLETED)

| Element | Animation | Status |
|---------|-----------|--------|
| Primary buttons (.btn-primary) | Press scale, hover lift, shadow, ripple | ✅ Done |
| Secondary buttons (.btn-secondary) | Hover lift, border transition | ✅ Done |
| Danger buttons (.btn-danger) | Press scale, hover lift, red shadow | ✅ Done |
| Icon buttons (.btn-icon) | Scale bounce on tap | ✅ Done |
| All buttons | Tap highlight disabled, smooth cubic-bezier transitions | ✅ Done |
| Button loading state (.loading) | Spinner animation | ✅ Done |

### ✅ Phase 2 - Visual Polish (COMPLETED)

| Element | Animation | Status |
|---------|-----------|--------|
| Cards (.card) | Hover lift + shadow elevation | ✅ Done |
| Stat widgets | Hover translateY | ✅ Done |
| Form inputs | Focus glow, translateY lift | ✅ Done |
| Input error state (.input-error) | Shake animation | ✅ Done |
| Input success state (.input-success) | Success flash | ✅ Done |
| Sidebar nav items | Hover translateX, icon scale | ✅ Done |
| Quick Nav bar items | Press scale, icon pop on active | ✅ Done |
| Table rows | Staggered fade-in on load | ✅ Done |
| Toggle switches | Spring physics, knob stretch on press | ✅ Done |

### ✅ Phase 3 - Delight (COMPLETED)

| Element | Animation | Status |
|---------|-----------|--------|
| Modals (.modal-overlay) | Backdrop fade + blur, content slide + scale | ✅ Done |
| Toast notifications | Slide in with bounce, hover shift, icon pop | ✅ Done |
| Menu toggle button | Press scale | ✅ Done |
| Mobile search button | Press scale + color change | ✅ Done |
| Skeleton loaders | Improved shimmer effect | ✅ Done |
| Page content | Fade-in animation | ✅ Done |
| Dashboard/Stats grids | Staggered card fade-in | ✅ Done |
| Dark mode skeletons | Adjusted shimmer colors | ✅ Done |

### ✅ Accessibility (COMPLETED)

| Feature | Description | Status |
|---------|-------------|--------|
| prefers-reduced-motion | Disables all animations for users who prefer reduced motion | ✅ Done |

---

## 1. Primary Action Buttons

These are the main call-to-action buttons:

| Button | Location |
|--------|----------|
| "Add Product" | Inventory page |
| "Create Order" / "New Order" | Orders page |
| "Save" / "Save Changes" | Settings, AddProduct, CreateOrder, Profile |
| "Add Customer" | Customers page |
| "Add Vendor" | Vendors page |
| "Add Task" | Tasks page |

**Suggested animations:**
- Press scale effect (scale down on press, bounce back)
- Ripple effect on click
- Loading spinner on submit
- Success checkmark animation on completion

---

## 2. Secondary/Outline Buttons

| Button | Location |
|--------|----------|
| "Cancel" | Modals, forms |
| "Edit" | Inline editing |
| "Delete" | With confirmation |
| "Export" / "Download PDF" | Analytics, Orders |
| "Filter" / "Sort" toggles | Tables, lists |

**Suggested animations:**
- Subtle hover lift (translateY)
- Border color transition
- Background fill on hover

---

## 3. Icon Buttons

| Button | Location |
|--------|----------|
| Menu toggle (hamburger) | Navbar |
| Search button | Mobile header |
| Close buttons (×) | Modals, sidebar, search |
| Bell/notification icon | Header |
| Quick Nav bar icons | Bottom navbar |
| Sidebar nav items | Sidebar |

**Suggested animations:**
- Rotate on toggle (hamburger → X)
- Scale bounce on tap
- Icon morph transitions
- Pulse effect for notifications

---

## 4. Toggle Switches

| Toggle | Location |
|--------|----------|
| Dark mode toggle | Settings |
| Email Alerts toggle | Settings |
| Low Stock Alerts toggle | Settings |
| Order Notifications toggle | Settings |
| Weekly Reports toggle | Settings |
| Quick Navigation enable/disable | Settings |

**Suggested animations:**
- Smooth slide with spring physics
- Color fade transition
- Thumb bounce effect

---

## 5. Cards & List Items

| Element | Location |
|---------|----------|
| Product cards | Inventory |
| Order cards | Orders |
| Customer/Vendor rows | Tables |
| Task items | Tasks page |
| Activity log entries | Activity Log |
| Dashboard stat widgets | Dashboard |

**Suggested animations:**
- Hover lift with shadow elevation
- Staggered entry animation on page load
- Swipe actions (mobile)
- Skeleton loading shimmer
- Checkbox completion animation (tasks)

---

## 6. Form Inputs

| Element | Location |
|---------|----------|
| Text inputs | All forms |
| Select dropdowns | All forms |
| Quantity steppers (+/-) | CreateOrder, AddProduct |
| Search input | Header, GlobalSearch |
| Textarea | Notes, descriptions |

**Suggested animations:**
- Border glow on focus
- Floating label animation
- Shake on validation error
- Success border flash on valid input

---

## 7. Modals & Overlays

| Element | Location |
|---------|----------|
| Confirmation dialogs | Delete actions |
| Global Search modal | Header search |
| Sidebar overlay | Mobile sidebar |
| Toast notifications | App-wide |

**Suggested animations:**
- Fade + scale in (zoom effect)
- Backdrop blur transition
- Slide up from bottom (mobile)
- Slide down to dismiss

---

## 8. Navigation Elements

| Element | Location |
|---------|----------|
| Sidebar menu items | Sidebar |
| Quick Nav bar items | Bottom bar |
| Tab switches | Various pages |
| Breadcrumbs | Page headers |

**Suggested animations:**
- Active indicator slide/morph
- Icon bounce on select
- Underline slide transition
- Background pill animation

---

## Implementation Priority

### Phase 1 - High Impact
1. Primary buttons (press feedback, loading states)
2. Icon buttons (scale, rotate effects)
3. Toggle switches (smooth transitions)

### Phase 2 - Visual Polish
4. Cards & list items (hover effects, staggered entry)
5. Form inputs (focus states, validation feedback)
6. Navigation elements (active state transitions)

### Phase 3 - Delight
7. Modals & overlays (entrance/exit animations)
8. Skeleton loaders (shimmer effects)
9. Success/error state animations

---

## Technical Notes

- Use CSS transitions for simple hover/focus states
- Use CSS keyframe animations for complex sequences
- Consider `prefers-reduced-motion` media query for accessibility
- Use `transform` and `opacity` for performant animations
- Avoid animating `width`, `height`, or `margin` (layout thrashing)
