# Rasd visual identity

The visual source is the supplied `رَصد — الهوية البصرية (1).html` export, using its Version 2 boards and design-system board. The application uses the existing React views and live API data rather than the sample identities, transactions, comparisons, and device values in those boards.

## Foundations

| Element | Reference value |
|---|---|
| Sidebar | 256px; `#0B2E25`; 16px / 12px padding |
| Topbar | 64px; white; 32px horizontal padding |
| Page | `#F6F7F8`; 32px padding; 24px section spacing |
| Main action | `#14513F`; 40px height; 8px radius |
| Gold accent | `#C9A24B` |
| Card | White; `#E1E4E8` border; 12px radius |
| Card shadow | `0 1px 2px rgba(16,24,40,.06)` |
| Body type | IBM Plex Sans Arabic; 14px / 1.6 |
| Wordmark | Reem Kufi; 700 |
| Page heading | 24px / 1.3; 600 |
| Metric number | 30px / 1.3; 600 |
| Icon | 20px; 1.75px stroke; rounded caps and joins |

Fonts are served locally from `frontend/public/fonts/`, alongside their licenses. The logo and matching navigation icons use the supplied SVG geometry. `frontend/src/style.css` is the single visual system; new themes must not be appended as competing override layers.

## Application adaptations

- Retain actual role permissions, API data, private evidence downloads, and case actions. Do not populate reference charts with invented values or add inactive period filters.
- The desktop appeal list uses a compact table and selected-appeal detail panel; authorized decisions continue through the existing confirmation dialog.
- Optional one-time codes remain available within the login form. The reference's separate verification screen is not represented as an implemented authentication step.
- Long generated case references use a responsive single-line heading. Mobile resources render as cards, with a drawer for staff navigation.
- Evaluation and simulation notices remain visible in the login area and workspace footer, with action-specific notices where needed.

## Verification

Use `npm run build`, `npm test`, and the existing Playwright lifecycle with a disposable backend. Check login, dashboard, resource tables, case detail, appeal selection, forms, and mobile navigation against the supplied boards. Screenshots should use 1280px desktop and 390px mobile widths; narrow layouts must not overflow horizontally.
