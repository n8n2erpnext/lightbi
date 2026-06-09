# LightBI UI Visual Baseline

This document serves as the locked visual baseline for the LightBI frontend. All future components, features, and dashboards must adhere to these rules. The aesthetic is heavily inspired by Frappe Insights—prioritizing a dense, calm, and analytical workspace over generic SaaS marketing UI.

## 1. Color Rules
- **Primary Scale (Neutrals)**: `gray` or `zinc` (e.g., `bg-gray-50` for canvas, `bg-white` for panels).
- **Main Actions**: `bg-gray-900` or `black` with `text-white`.
- **Secondary Actions**: `bg-white` with `border-gray-200` and `text-gray-700`.
- **Accent Colors**: Strictly forbidden for UI chrome. Use blue/green/red/pink **only** inside charts as data series colors.
- **Metric Status**: Use `text-emerald-600` or `text-red-600` strictly for positive/negative metric indicators (e.g., KPI confidence score or percentage changes).

## 2. Typography Rules
- **Font**: Inter-like sans-serif.
- **Page Titles**: `text-xl` to `text-3xl`, `font-semibold` or `font-medium`, `text-gray-900`.
- **Section Headers**: Compact and often uppercase tracking (e.g., `text-[11px] uppercase tracking-wider text-gray-500`).
- **Body Text**: `text-[13px]` or `text-sm`, `text-gray-600` or `text-gray-700`.
- **Gradients**: Completely forbidden.

## 3. App Shell & Sidebar Rules
- **Sidebar**: Must be `bg-white` with a very thin `border-r border-gray-200`.
- **Navigation**: Compact items (`h-8` or `h-9`). Active states use `bg-gray-100 text-gray-900`. Inactive states use `text-gray-600 hover:bg-gray-50`.
- **Top Header**: Simple, `h-12` or `h-14`, neutral header actions without vibrant call-to-action buttons.

## 4. Button Rules
- **Primary**: `bg-gray-900 text-white hover:bg-gray-800 rounded-md px-4 py-2 text-sm font-medium`.
- **Secondary**: `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md px-4 py-2 text-sm font-medium`.
- **Icon Buttons**: Use `text-gray-500 hover:text-gray-800 hover:bg-gray-100 p-1.5 rounded-md`.

## 5. Card & Widget Rules
- **Structure**: `bg-white`, `border border-gray-200`, `rounded-md`.
- **Padding**: Compact `p-3.5` or `p-4` inside dashboards. `p-5` or `p-6` for larger standalone views.
- **Shadows**: Extremely subtle `shadow-sm` or none. Never use large, diffuse drop shadows.
- **Hover**: Borders may transition to `hover:border-gray-300` or `hover:border-gray-400`.

## 6. Table Rules
- **Treatment**: Treated as first-class analytical output, not just standard lists.
- **Headers**: Dense and uppercase (e.g., `bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-500 px-5 py-2.5`).
- **Rows**: `text-[13px]`, tight padding (`py-3`), separated by thin `border-b border-gray-100`.
- **Hover**: Subtle `hover:bg-gray-50/80`.

## 7. Dashboard Density Rules
- **Canvas**: `bg-gray-50` to clearly distinguish white widgets from the background.
- **Grid Gap**: Dense (`gap-3` or `gap-4`).
- **KPI Typography**: Tight values (`text-xl font-semibold` instead of `text-3xl font-bold`).
- **Information Density**: Maximize data visibility on the screen. Avoid padding that wastes vertical space.

## 8. Question-First Home Rules
- **Prompt**: Central focus on "What do you want to understand today?".
- **Suggested Questions**: Rendered as secondary pill buttons (`rounded-md`), not colorful bubbles.
- **Pipeline Rendering**: Visualized as a clean, compact horizontal block (Question → Template → Chart → Insight) using white panels and subtle gray `ChevronRight` separators.

## 9. Forbidden Patterns
- **No Blue UI**: `bg-blue-*`, `text-blue-*`, or `border-blue-*` must never be used for primary actions, links, or navigation.
- **No Dashboard Clutter**: Dashboards must not be flooded with marketing-style drop shadows, massive rounded corners (`rounded-2xl`), or vibrant gradient backgrounds.
- **No Unhandled Crashes**: Raw React stack traces must be caught by a neutral `<RouteError />` boundary.
