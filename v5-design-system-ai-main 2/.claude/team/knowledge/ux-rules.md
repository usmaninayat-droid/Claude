# UX Rules (harvested from UI UX Pro Max, MIT — FAMS-adapted)

> The UX + QA + A11y review brain (99 rules). Colours/styles do NOT apply — FAMS tokens are the only palette. Use these for behaviour, states, a11y, interaction.

## AI Interaction

- **Disclaimer** (High) — Users need to know they talk to AI. _Do:_ Clearly label AI generated content. _Don't:_ Present AI as human.
- **Streaming** (Medium) — Waiting for full text is slow. _Do:_ Stream text response token by token. _Don't:_ Show loading spinner for 10s+.
- **Feedback Loop** (Low) — AI needs user feedback to improve. _Do:_ Thumps up/down or 'Regenerate'. _Don't:_ Static output only.

## Accessibility

- **Color Contrast** (High) — Text must be readable against background. _Do:_ Minimum 4.5:1 ratio for normal text. _Don't:_ Low contrast text.
- **Color Only** (High) — Don't convey information by color alone. _Do:_ Use icons/text in addition to color. _Don't:_ Red/green only for error/success.
- **Alt Text** (High) — Images need text alternatives. _Do:_ Descriptive alt text for meaningful images. _Don't:_ Empty or missing alt attributes.
- **Heading Hierarchy** (Medium) — Screen readers use headings for navigation. _Do:_ Use sequential heading levels h1-h6. _Don't:_ Skip heading levels or misuse for styling.
- **ARIA Labels** (High) — Interactive elements need accessible names. _Do:_ Add aria-label for icon-only buttons. _Don't:_ Icon buttons without labels.
- **Keyboard Navigation** (High) — All functionality accessible via keyboard. _Do:_ Tab order matches visual order. _Don't:_ Keyboard traps or illogical tab order.
- **Screen Reader** (Medium) — Content should make sense when read aloud. _Do:_ Use semantic HTML and ARIA properly. _Don't:_ Div soup with no semantics.
- **Form Labels** (High) — Inputs must have associated labels. _Do:_ Use label with for attribute or wrap input. _Don't:_ Placeholder-only inputs.
- **Error Messages** (High) — Error messages must be announced. _Do:_ Use aria-live or role=alert for errors. _Don't:_ Visual-only error indication.
- **Skip Links** (Medium) — Allow keyboard users to skip navigation. _Do:_ Provide skip to main content link. _Don't:_ No skip link on nav-heavy pages.
- **Motion Sensitivity** (High) — Parallax/Scroll-jacking causes nausea. _Do:_ Respect prefers-reduced-motion. _Don't:_ Force scroll effects.

## Animation

- **Excessive Motion** (High) — Too many animations cause distraction and motion sickness. _Do:_ Animate 1-2 key elements per view maximum. _Don't:_ Animate everything that moves.
- **Duration Timing** (Medium) — Animations should feel responsive not sluggish. _Do:_ Use 150-300ms for micro-interactions. _Don't:_ Use animations longer than 500ms for UI.
- **Reduced Motion** (High) — Respect user's motion preferences. _Do:_ Check prefers-reduced-motion media query. _Don't:_ Ignore accessibility motion settings.
- **Loading States** (High) — Show feedback during async operations. _Do:_ Use skeleton screens or spinners. _Don't:_ Leave UI frozen with no feedback.
- **Hover vs Tap** (High) — Hover effects don't work on touch devices. _Do:_ Use click/tap for primary interactions. _Don't:_ Rely only on hover for important actions.
- **Continuous Animation** (Medium) — Infinite animations are distracting. _Do:_ Use for loading indicators only. _Don't:_ Use for decorative elements.
- **Transform Performance** (Medium) — Some CSS properties trigger expensive repaints. _Do:_ Use transform and opacity for animations. _Don't:_ Animate width/height/top/left properties.
- **Easing Functions** (Low) — Linear motion feels robotic. _Do:_ Use ease-out for entering ease-in for exiting. _Don't:_ Use linear for UI transitions.

## Content

- **Truncation** (Medium) — Handle long content gracefully. _Do:_ Truncate with ellipsis and expand option. _Don't:_ Overflow or broken layout.
- **Date Formatting** (Low) — Use locale-appropriate date formats. _Do:_ Use relative or locale-aware dates. _Don't:_ Ambiguous date formats.
- **Number Formatting** (Low) — Format large numbers for readability. _Do:_ Use thousand separators or abbreviations. _Don't:_ Long unformatted numbers.
- **Placeholder Content** (Low) — Show realistic placeholders during dev. _Do:_ Use realistic sample data. _Don't:_ Lorem ipsum everywhere.

## Data Entry

- **Bulk Actions** (Low) — Editing one by one is tedious. _Do:_ Allow multi-select and bulk edit. _Don't:_ Single row actions only.

## Feedback

- **Loading Indicators** (High) — Show system status during waits. _Do:_ Show spinner/skeleton for operations > 300ms. _Don't:_ No feedback during loading.
- **Empty States** (Medium) — Guide users when no content exists. _Do:_ Show helpful message and action. _Don't:_ Blank empty screens.
- **Error Recovery** (Medium) — Help users recover from errors. _Do:_ Provide clear next steps. _Don't:_ Error without recovery path.
- **Progress Indicators** (Medium) — Show progress for multi-step processes. _Do:_ Step indicators or progress bar. _Don't:_ No indication of progress.
- **Toast Notifications** (Medium) — Transient messages for non-critical info. _Do:_ Auto-dismiss after 3-5 seconds. _Don't:_ Toasts that never disappear.
- **Confirmation Messages** (Medium) — Confirm successful actions. _Do:_ Brief success message. _Don't:_ Silent success.

## Forms

- **Input Labels** (High) — Every input needs a visible label. _Do:_ Always show label above or beside input. _Don't:_ Placeholder as only label.
- **Error Placement** (Medium) — Errors should appear near the problem. _Do:_ Show error below related input. _Don't:_ Single error message at top of form.
- **Inline Validation** (Medium) — Validate as user types or on blur. _Do:_ Validate on blur for most fields. _Don't:_ Validate only on submit.
- **Input Types** (Medium) — Use appropriate input types. _Do:_ Use email tel number url etc. _Don't:_ Text input for everything.
- **Autofill Support** (Medium) — Help browsers autofill correctly. _Do:_ Use autocomplete attribute properly. _Don't:_ Block or ignore autofill.
- **Required Indicators** (Medium) — Mark required fields clearly. _Do:_ Use asterisk or (required) text. _Don't:_ No indication of required fields.
- **Password Visibility** (Medium) — Let users see password while typing. _Do:_ Toggle to show/hide password. _Don't:_ No visibility toggle.
- **Submit Feedback** (High) — Confirm form submission status. _Do:_ Show loading then success/error state. _Don't:_ No feedback after submit.
- **Input Affordance** (Medium) — Inputs should look interactive. _Do:_ Use distinct input styling. _Don't:_ Inputs that look like plain text.
- **Mobile Keyboards** (Medium) — Show appropriate keyboard for input type. _Do:_ Use inputmode attribute. _Don't:_ Default keyboard for all inputs.

## Interaction

- **Focus States** (High) — Keyboard users need visible focus indicators. _Do:_ Use visible focus rings on interactive elements. _Don't:_ Remove focus outline without replacement.
- **Hover States** (Medium) — Visual feedback on interactive elements. _Do:_ Change cursor and add subtle visual change. _Don't:_ No hover feedback on clickable elements.
- **Active States** (Medium) — Show immediate feedback on press/click. _Do:_ Add pressed/active state visual change. _Don't:_ No feedback during interaction.
- **Disabled States** (Medium) — Clearly indicate non-interactive elements. _Do:_ Reduce opacity and change cursor. _Don't:_ Confuse disabled with normal state.
- **Loading Buttons** (High) — Prevent double submission during async actions. _Do:_ Disable button and show loading state. _Don't:_ Allow multiple clicks during processing.
- **Error Feedback** (High) — Users need to know when something fails. _Do:_ Show clear error messages near problem. _Don't:_ Silent failures with no feedback.
- **Success Feedback** (Medium) — Confirm successful actions to users. _Do:_ Show success message or visual change. _Don't:_ No confirmation of completed action.
- **Confirmation Dialogs** (High) — Prevent accidental destructive actions. _Do:_ Confirm before delete/irreversible actions. _Don't:_ Delete without confirmation.

## Layout

- **Z-Index Management** (High) — Stacking context conflicts cause hidden elements. _Do:_ Define z-index scale system (10 20 30 50). _Don't:_ Use arbitrary large z-index values.
- **Overflow Hidden** (Medium) — Hidden overflow can clip important content. _Do:_ Test all content fits within containers. _Don't:_ Blindly apply overflow-hidden.
- **Fixed Positioning** (Medium) — Fixed elements can overlap or be inaccessible. _Do:_ Account for safe areas and other fixed elements. _Don't:_ Stack multiple fixed elements carelessly.
- **Stacking Context** (Medium) — New stacking contexts reset z-index. _Do:_ Understand what creates new stacking context. _Don't:_ Expect z-index to work across contexts.
- **Content Jumping** (High) — Layout shift when content loads is jarring. _Do:_ Reserve space for async content. _Don't:_ Let images/content push layout around.
- **Viewport Units** (Medium) — 100vh can be problematic on mobile browsers. _Do:_ Use dvh or account for mobile browser chrome. _Don't:_ Use 100vh for full-screen mobile layouts.
- **Container Width** (Medium) — Content too wide is hard to read. _Do:_ Limit max-width for text content (65-75ch). _Don't:_ Let text span full viewport width.

## Navigation

- **Smooth Scroll** (High) — Anchor links should scroll smoothly to target section. _Do:_ Use scroll-behavior: smooth on html element. _Don't:_ Jump directly without transition.
- **Sticky Navigation** (Medium) — Fixed nav should not obscure content. _Do:_ Add padding-top to body equal to nav height. _Don't:_ Let nav overlap first section content.
- **Active State** (Medium) — Current page/section should be visually indicated. _Do:_ Highlight active nav item with color/underline. _Don't:_ No visual feedback on current location.
- **Back Button** (High) — Users expect back to work predictably. _Do:_ Preserve navigation history properly. _Don't:_ Break browser/app back button behavior.
- **Deep Linking** (Medium) — URLs should reflect current state for sharing. _Do:_ Update URL on state/view changes. _Don't:_ Static URLs for dynamic content.
- **Breadcrumbs** (Low) — Show user location in site hierarchy. _Do:_ Use for sites with 3+ levels of depth. _Don't:_ Use for flat single-level sites.

## Onboarding

- **User Freedom** (Medium) — Users should be able to skip tutorials. _Do:_ Provide Skip and Back buttons. _Don't:_ Force linear unskippable tour.

## Performance

- **Image Optimization** (High) — Large images slow page load. _Do:_ Use appropriate size and format (WebP). _Don't:_ Unoptimized full-size images.
- **Lazy Loading** (Medium) — Load content as needed. _Do:_ Lazy load below-fold images and content. _Don't:_ Load everything upfront.
- **Code Splitting** (Medium) — Large bundles slow initial load. _Do:_ Split code by route/feature. _Don't:_ Single large bundle.
- **Caching** (Medium) — Repeat visits should be fast. _Do:_ Set appropriate cache headers. _Don't:_ No caching strategy.
- **Font Loading** (Medium) — Web fonts can block rendering. _Do:_ Use font-display swap or optional. _Don't:_ Invisible text during font load.
- **Third Party Scripts** (Medium) — External scripts can block rendering. _Do:_ Load non-critical scripts async/defer. _Don't:_ Synchronous third-party scripts.
- **Bundle Size** (Medium) — Large JavaScript slows interaction. _Do:_ Monitor and minimize bundle size. _Don't:_ Ignore bundle size growth.
- **Render Blocking** (Medium) — CSS/JS can block first paint. _Do:_ Inline critical CSS defer non-critical. _Don't:_ Large blocking CSS files.

## Responsive

- **Mobile First** (Medium) — Design for mobile then enhance for larger. _Do:_ Start with mobile styles then add breakpoints. _Don't:_ Desktop-first causing mobile issues.
- **Breakpoint Testing** (Medium) — Test at all common screen sizes. _Do:_ Test at 320 375 414 768 1024 1440. _Don't:_ Only test on your device.
- **Touch Friendly** (High) — Mobile layouts need touch-sized targets. _Do:_ Increase touch targets on mobile. _Don't:_ Same tiny buttons on mobile.
- **Readable Font Size** (High) — Text must be readable on all devices. _Do:_ Minimum 16px body text on mobile. _Don't:_ Tiny text on mobile.
- **Viewport Meta** (High) — Set viewport for mobile devices. _Do:_ Use width=device-width initial-scale=1. _Don't:_ Missing or incorrect viewport.
- **Horizontal Scroll** (High) — Avoid horizontal scrolling. _Do:_ Ensure content fits viewport width. _Don't:_ Content wider than viewport.
- **Image Scaling** (Medium) — Images should scale with container. _Do:_ Use max-width: 100% on images. _Don't:_ Fixed width images overflow.
- **Table Handling** (Medium) — Tables can overflow on mobile. _Do:_ Use horizontal scroll or card layout. _Don't:_ Wide tables breaking layout.

## Search

- **Autocomplete** (Medium) — Help users find results faster. _Do:_ Show predictions as user types. _Don't:_ Require full type and enter.
- **No Results** (Medium) — Dead ends frustrate users. _Do:_ Show 'No results' with suggestions. _Don't:_ Blank screen or '0 results'.

## Spatial UI

- **Gaze Hover** (High) — Elements should respond to eye tracking before pinch. _Do:_ Scale/highlight element on look. _Don't:_ Static element until pinch.
- **Depth Layering** (Medium) — UI needs Z-depth to separate content from environment. _Do:_ Use glass material and z-offset. _Don't:_ Flat opaque panels blocking view.

## Sustainability

- **Auto-Play Video** (Medium) — Video consumes massive data and energy. _Do:_ Click-to-play or pause when off-screen. _Don't:_ Auto-play high-res video loops.
- **Asset Weight** (Medium) — Heavy 3D/Image assets increase carbon footprint. _Do:_ Compress and lazy load 3D models. _Don't:_ Load 50MB textures.

## Touch

- **Touch Target Size** (High) — Small buttons are hard to tap accurately. _Do:_ Minimum 44x44px touch targets. _Don't:_ Tiny clickable areas.
- **Touch Spacing** (Medium) — Adjacent touch targets need adequate spacing. _Do:_ Minimum 8px gap between touch targets. _Don't:_ Tightly packed clickable elements.
- **Gesture Conflicts** (Medium) — Custom gestures can conflict with system. _Do:_ Avoid horizontal swipe on main content. _Don't:_ Override system gestures.
- **Tap Delay** (Medium) — 300ms tap delay feels laggy. _Do:_ Use touch-action CSS or fastclick. _Don't:_ Default mobile tap handling.
- **Pull to Refresh** (Low) — Accidental refresh is frustrating. _Do:_ Disable where not needed. _Don't:_ Enable by default everywhere.
- **Haptic Feedback** (Low) — Tactile feedback improves interaction feel. _Do:_ Use for confirmations and important actions. _Don't:_ Overuse vibration feedback.

## Typography

- **Line Height** (Medium) — Adequate line height improves readability. _Do:_ Use 1.5-1.75 for body text. _Don't:_ Cramped or excessive line height.
- **Line Length** (Medium) — Long lines are hard to read. _Do:_ Limit to 65-75 characters per line. _Don't:_ Full-width text on large screens.
- **Font Size Scale** (Medium) — Consistent type hierarchy aids scanning. _Do:_ Use consistent modular scale. _Don't:_ Random font sizes.
- **Font Loading** (Medium) — Fonts should load without layout shift. _Do:_ Reserve space with fallback font. _Don't:_ Layout shift when fonts load.
- **Contrast Readability** (High) — Body text needs good contrast. _Do:_ Use darker text on light backgrounds. _Don't:_ Gray text on gray background.
- **Heading Clarity** (Medium) — Headings should stand out from body. _Do:_ Clear size/weight difference. _Don't:_ Headings similar to body text.

