# Focsd — Component Catalogue (MVP 75 + additions)

Owner request (2026-10-04): "I want most used 75 components on ui as part of the mvp."

The selection is drawn from what the libraries in the research (shadcn/ui, MUI, Ant Design, Bootstrap, Chakra, Mantine, React Aria, Web Awesome, Carbon) commonly ship, weighted toward the "paywalled or missing" items developers asked for. Sub-elements (`focsd-option`, `focsd-tab`, `focsd-tab-panel`, `focsd-menu-item`, …) are not counted separately.

**Status legend:**
- **built** means it's in `@focsd-dev/components`, has a playground section, ARIA snapshot and keyboard tests, and zero axe violations in Chromium, Firefox and WebKit.
- **planned** means not started.

| # | Component | Tag | Category | APG / pattern | Wave | Status |
|---|---|---|---|---|---|---|
| 1 | Button | `focsd-button` | Actions | Button | 1 | built |
| 2 | Text field | `focsd-text-field` | Forms | Native input | 1 | built |
| 3 | Dialog | `focsd-dialog` | Overlays | Dialog (modal) | 1 | built |
| 4 | Tabs | `focsd-tabs` | Navigation | Tabs | 1 | built |
| 5 | Select | `focsd-select` | Forms | Listbox button (popover) | 1 | built |
| 6 | Badge | `focsd-badge` | Display | Static | 2 | built |
| 7 | Tag / chip | `focsd-tag` | Display | Static + optional remove button | 2 | built |
| 8 | Card | `focsd-card` | Display | Static (article/section) | 2 | built |
| 9 | Separator | `focsd-separator` | Layout | Separator | 2 | built |
| 10 | Alert / banner | `focsd-alert` | Feedback | Alert / status | 2 | built |
| 11 | Avatar | `focsd-avatar` | Display | Img with text fallback | 2 | built |
| 12 | Avatar group | `focsd-avatar-group` | Display | List | 2 | built |
| 13 | Kbd | `focsd-kbd` | Display | Static | 2 | built |
| 14 | Skeleton | `focsd-skeleton` | Feedback | aria-busy placeholder | 2 | built |
| 15 | Spinner | `focsd-spinner` | Feedback | Status (polite) | 2 | built |
| 16 | Progress bar | `focsd-progress` | Feedback | Progressbar | 2 | built |
| 17 | Meter | `focsd-meter` | Feedback | Meter | 2 | built |
| 18 | Link | `focsd-link` | Actions | Link | 2 | built |
| 19 | Visually hidden | `focsd-visually-hidden` | Utility | SR-only | 2 | built |
| 20 | Icon | `focsd-icon` | Utility | Decorative / labeled img | 2 | built |
| 21 | Skip link | `focsd-skip-link` | Navigation | Skip link | 2 | built |
| 22 | Textarea | `focsd-textarea` | Forms | Native textarea | 3 | built |
| 23 | Checkbox | `focsd-checkbox` | Forms | Checkbox (incl. mixed) | 3 | built |
| 24 | Checkbox group | `focsd-checkbox-group` | Forms | Group + fieldset | 3 | built |
| 25 | Radio group | `focsd-radio-group` | Forms | Radio group | 3 | built |
| 26 | Switch | `focsd-switch` | Forms | Switch | 3 | built |
| 27 | Number field | `focsd-number-field` | Forms | Spinbutton | 3 | built |
| 28 | Search field | `focsd-search-field` | Forms | Searchbox | 3 | built |
| 29 | Password field | `focsd-password-field` | Forms | Input + visibility toggle | 3 | built |
| 30 | Slider | `focsd-slider` | Forms | Slider (single + range) | 3 | built |
| 31 | OTP input | `focsd-otp-field` | Forms | Grouped inputs | 3 | built |
| 32 | Fieldset | `focsd-fieldset` | Forms | Fieldset + legend | 3 | built |
| 33 | Error summary | `focsd-error-summary` | Forms | Alert with links to fields | 3 | built |
| 34 | Toggle | `focsd-toggle` | Actions | Toggle button (aria-pressed) | 3 | built |
| 35 | Toggle group | `focsd-toggle-group` | Actions | Toolbar / radio-like group | 3 | built |
| 36 | Icon button | `focsd-icon-button` | Actions | Button with accessible label | 3 | built |
| 37 | Button group | `focsd-button-group` | Actions | Group | 3 | built |
| 38 | Rating | `focsd-rating` | Forms | Radio group | 3 | built |
| 39 | Popover | `focsd-popover` | Overlays | Non-modal dialog (popover API) | 4 | built |
| 40 | Tooltip | `focsd-tooltip` | Overlays | Tooltip (hover + focus, Esc) | 4 | built |
| 41 | Dropdown menu | `focsd-menu` | Overlays | Menu button | 4 | built |
| 42 | Context menu | `focsd-context-menu` | Overlays | Menu | 4 | built |
| 43 | Alert dialog | `focsd-alert-dialog` | Overlays | Alert dialog | 4 | built |
| 44 | Drawer / sheet | `focsd-drawer` | Overlays | Dialog (modal, edge) | 4 | built |
| 45 | Toast | `focsd-toast` / `focsd-toaster` | Feedback | Status / log region | 4 | built |
| 46 | Accordion | `focsd-accordion` | Disclosure | Accordion | 4 | built |
| 47 | Disclosure | `focsd-disclosure` | Disclosure | Disclosure (details) | 4 | built |
| 48 | Breadcrumb | `focsd-breadcrumb` | Navigation | Breadcrumb | 5 | built |
| 49 | Pagination | `focsd-pagination` | Navigation | Navigation landmark | 5 | built |
| 50 | Navigation menu | `focsd-nav-menu` | Navigation | Disclosure navigation | 5 | built |
| 51 | Sidebar | `focsd-sidebar` | Navigation | Navigation landmark + collapse | 5 | built |
| 52 | Menubar | `focsd-menubar` | Navigation | Menubar | 5 | built |
| 53 | Stepper | `focsd-stepper` | Navigation | List with current step | 5 | built |
| 54 | Header / top bar | `focsd-header` | Navigation | Banner landmark | 5 | built |
| 55 | Toolbar | `focsd-toolbar` | Actions | Toolbar | 5 | built |
| 56 | List | `focsd-list` | Display | List / listbox (selectable) | 5 | built |
| 57 | Description list | `focsd-description-list` | Display | dl | 5 | built |
| 58 | Table | `focsd-table` | Data | Table (sortable headers) | 6 | built |
| 59 | Data grid | `focsd-data-grid` | Data | Grid (sort, filter, paginate, virtualize) | 6 | built |
| 60 | Tree view | `focsd-tree` | Data | Tree | 6 | built |
| 61 | Timeline | `focsd-timeline` | Display | Ordered list | 6 | built |
| 62 | Empty state | `focsd-empty-state` | Feedback | Static | 6 | built |
| 63 | Code block | `focsd-code` | Display | Pre/code + copy button | 6 | built |
| 64 | Image / aspect ratio | `focsd-image` | Display | Img with ratio + fallback | 6 | built |
| 65 | Scroll area | `focsd-scroll-area` | Layout | Focusable scroll region | 6 | built |
| 66 | Splitter / resizable | `focsd-splitter` | Layout | Window splitter | 6 | built |
| 67 | Carousel | `focsd-carousel` | Display | Carousel (pause, prev/next) | 6 | built |
| 68 | Combobox | `focsd-combobox` | Forms | Combobox (autocomplete) | 7 | built |
| 69 | Multi-select | `focsd-multi-select` | Forms | Combobox + tags | 7 | built |
| 70 | Calendar | `focsd-calendar` | Forms | Grid (date) | 7 | built |
| 71 | Date picker | `focsd-date-picker` | Forms | Dialog + grid | 7 | built |
| 72 | Date range picker | `focsd-date-range-picker` | Forms | Dialog + grid | 7 | built |
| 73 | Time field | `focsd-time-field` | Forms | Spinbutton segments | 7 | built |
| 74 | File upload | `focsd-file-upload` | Forms | Button + drop zone + list | 7 | built |
| 75 | Command palette | `focsd-command` | Overlays | Dialog + combobox | 7 | built |
| 76 | Footer | `focsd-footer` | Navigation | Contentinfo landmark + link sections | 8 | built |
| 77 | Rich text editor | `focsd-rich-text` | Forms | Textbox (multi-line, contenteditable) + toolbar | 12 | built |
| 78 | Chart | `focsd-chart` | Charts | Figure + data table + keyboard-explorable points | 12 | built |
| 79 | Floating panel | `focsd-floating-panel` | Overlays | Non-modal dialog, draggable, keyboard move (WCAG 2.5.7) | 13 | built |
| 80 | Color picker | `focsd-color-picker` | Forms | 2D slider + sliders + text field + swatches | 13 | built |
| 81 | Tag input | `focsd-tag-input` | Forms | Text input + list of removable tags (+ optional listbox) | 13 | built |
| 82 | Phone field | `focsd-phone-field` | Forms | Group: country combobox + tel input, E.164 value | 13 | built |
| 83 | Currency field | `focsd-currency-field` | Forms | Spinbutton with locale-formatted currency | 13 | built |
| 84 | Hover card | `focsd-hover-card` | Overlays | Non-modal popover on hover/focus, hoverable and dismissible (1.4.13) | 13 | built |
| 85 | Bottom sheet | `focsd-bottom-sheet` | Overlays | Modal dialog or region at the bottom edge, snap points, keyboard resize | 13 | built |
| 86 | Virtual list | `focsd-virtual-list` | Data | List or listbox rendering only visible rows, setsize/posinset | 13 | built |
| 87 | Masonry | `focsd-masonry` | Layout | Columns of varying height, DOM-order placement by default | 13 | built |
| 88 | Field | `focsd-field` | Forms | Label, hint and messages for any control (light-DOM IDs) | 14 | built |
| 89 | Date field | `focsd-date-field` | Forms | Spinbutton segments (day, month, year) | 14 | built |
| 90 | Listbox | `focsd-listbox` | Forms | Listbox (aria-activedescendant) | 14 | built |
| 91 | Date and time picker | `focsd-date-time-picker` | Forms | Group: date input + dialog (calendar, time) + time field | 14 | built |
| 92 | Swatch picker | `focsd-swatch-picker` | Forms | Radio group of swatches + custom color popover | 14 | built |
| 93 | Editable | `focsd-editable` | Forms | Button that switches to a text field | 14 | built |
| 94 | Split button | `focsd-split-button` | Actions | Group: button + menu button (Menu Button) | 14 | built |
| 95 | Tour | `focsd-tour` | Overlays | Non-modal dialog anchored to each step's target | 14 | built |
| 96 | Toggletip | `focsd-toggletip` | Overlays | Button + non-modal popover, announced politely | 14 | built |
| 97 | QR code | `focsd-qr-code` | Display | SVG image (role=img) | 14 | built |
| 98 | Copy button | `focsd-copy-button` | Actions | Button + polite status | 14 | built |
| 99 | Loading overlay | `focsd-loading-overlay` | Feedback | Busy, inert region + overlay with status | 14 | built |
| 100 | Format number | `focsd-format-number` | Utility | Data element (Intl.NumberFormat) | 14 | built |
| 101 | Relative time | `focsd-relative-time` | Utility | Time element (Intl.RelativeTimeFormat) | 14 | built |
| 102 | App shell | `focsd-app-shell` | Layout | Landmarks grid + skip link + drawer below a width | 14 | built |
| 103 | Table of contents | `focsd-table-of-contents` | Navigation | Nav of links with aria-current="location" | 14 | built |
| 104 | Theme toggle | `focsd-theme-toggle` | Utility | Radio group (light / dark / system) | 16 | built |
| 105 | Theme picker | `focsd-theme-picker` | Utility | Radio group of preset swatch cards | 16 | built |
| 106 | Chat thread | `focsd-chat-thread` | AI | Feed (APG) with a jump-to-latest button | 17 | built |
| 107 | Chat message | `focsd-chat-message` | AI | Article in a feed | 17 | built |
| 108 | Streaming text | `focsd-streaming-text` | AI | Static text that grows while it streams | 17 | built |
| 109 | Tool call | `focsd-tool-call` | AI | Disclosure | 17 | built |
| 110 | Reasoning | `focsd-reasoning` | AI | Disclosure | 17 | built |
| 111 | Prompt suggestions | `focsd-prompt-suggestions` | AI | List of buttons | 17 | built |
| 112 | Message actions | `focsd-message-actions` | AI | Toolbar | 17 | built |
| 113 | Composer | `focsd-composer` | AI | Textbox (multi-line) + file drop | 17 | built |
| 114 | Attachment tile | `focsd-attachment-tile` | AI | List item with a remove button | 17 | built |
| 115 | Source chip | `focsd-source-chip` | AI | Link | 17 | built |
| 116 | Stat | `focsd-stat` | Display | Group named by its label; the change in words | 18 | built |
| 117 | Animated number | `focsd-animated-number` | Utility | Counting text (hidden) + visually hidden final value | 18 | built |
| 118 | Status dot | `focsd-status-dot` | Display | Image (role=img): a shape per status, named by its label | 18 | built |
| 119 | Sparkline | `focsd-sparkline` | Charts | Image (role=img) named by a generated sentence | 18 | built |
| 120 | Gauge | `focsd-gauge` | Charts | Meter (role=meter) with named bands | 18 | built |
| 121 | Segmented control | `focsd-segmented-control` | Forms | Radio group (selection follows focus) | 21 | built |
| 122 | Lightbox | `focsd-lightbox` | Overlays | Modal dialog + image gallery | 21 | built |
| 123 | Image compare | `focsd-image-compare` | Display | Slider (window splitter) | 21 | built |
| 124 | Signature pad | `focsd-signature-pad` | Forms | Image (role=img) with a typed-name alternative | 21 | built |
| 125 | Bottom navigation | `focsd-bottom-nav` | Navigation | Navigation landmark (links) | 21 | built |
| 126 | Notification center | `focsd-notification-center` | Overlays | Non-modal popover dialog + list | 21 | built |
| 127 | Dock | `focsd-dock` | Actions | Radio group (selection follows focus) | 21 | built |
| 128 | File changes | `focsd-file-changes` | AI | List of buttons (arrow keys) | 21 | built |

## Waves
1. **Foundation (5):** patterns for forms, overlays and composite keyboard navigation, the headless/styled split and the React adapter. Spec: `superpowers/specs/2026-10-04-foundation-mvp-design.md`.
2. **Display and feedback (16):** mostly static or simple ARIA. Fast once the base classes exist.
3. **Form controls (17):** reuse the form-control mixin from wave 1.
4. **Overlays and disclosure (9):** reuse dialog, popover and anchor positioning from wave 1.
5. **Navigation and lists (10).**
6. **Data and layout (10).**
7. **Complex inputs (8):** combobox, dates, file upload, command palette.
8. **Wave 13, common components (8):** color picker, tag input, phone and currency fields, hover card, bottom sheet, virtual list, masonry. Spec: `superpowers/specs/2026-10-11-wave13-common-components.md`.
9. **Wave 14 (16):** field, date field, listbox, date and time picker, swatch picker, editable, split button, tour, toggletip, QR code, copy button, loading overlay, format number, relative time, app shell, table of contents; plus consistent inputs and four upgrades. Spec: `superpowers/specs/2026-10-15-wave14-components-design.md`.
