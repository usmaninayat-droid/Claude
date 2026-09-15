# Wave 6 — Services & Frequencies · KPI Targets (metadata-derived, 1920 frames)
## Header (both): title Bold 18 (22h) + sub Regular 14 #98a2b3 at y26 (16h) → 42h; "Add New" SemiBold 16 primary + chevron 16 at y23
## Services empty (2111:3933): art 2111:3994 "Add Appointment" 193×139.5; text block 340w: title 13h + sub 2 lines (34h). Popup 356 @(1002,50): title "Select Services", search, "Selected Services"/"Select All"(primary), rows 40h no icons, 26 items → give list a scroll.
## Service card (2111:3868 · 3886 · 3911): 1358×134, border #eaecf0 r6, p16; title row 26h (text 22h Bold 18 at y4); fields row y62 h56 gap 20; card pitch 158 (gap 24)
- field 56h p8 border #d0d5dd r4: lead icon 20 @(8,18) · text col @x38: label 14h (12 SemiBold #98a2b3) / value 14h @y18 (16 SemiBold black) · chevron-down 12 right (p8)
- Action [plus-square]: Scheduled | Adhoc · Recurrence [calendar]: Daily/Weekly/… · Frequency [clock-fast-forward] "3 times" w/ chevron-selector-vertical 12 (stepper) when Weekly · Response Time [clock] "24 hours" when Adhoc
- 2 fields → 653 each; 3 fields → 428.67 each
## KPI (2111:4159, frame 1920×1377 → content scrolls)
- hint pill 2111:4212: 900×36 @y62: icon frame 20 @(10,8) + text @x36 (14px, 19h); pill bg primary-50 border primary-200 r-full (verify via design_context)
- grid: cards 667w, col gap 24, row gap 24 (row2 @578 = 60+494+24); card 494h p16 border #eaecf0 r6
- chips row @16 26h: `#` chip 58×26 (hash-02 16, text 10px) · tag chip 327×26 (tag-01 16 @x8, text uppercase 10px @x32) — bordered white chips (verify)
- title @54: Bold 18 (22h) · meta @92: 635×104 bg #f9fafb r4 p10: 3 rows 18h @0/24/48 → 14px italic "Label: value"
- Switch Tabs @208: 635×36, 3 × 211.67 (active white + bold; inactive #f2f4f7 Medium 14 #667085) bordered r4
- controls @256 h57: field p12/11: target-03 20 @(0,7.5) · text @x24: label 14h (12 SemiBold #98a2b3) + value 17h @y18 (16 SemiBold black) · stepper = 2 chevron-down 12 stacked (up = rotated) @right
  - fixed: 1 × 635 · yearly: 311.5 target + 311.5 [trend-up-01] "Yearly Increase" "+5%/year" chevron-down · manual: 5 × 117.4 gap 12
- preview @325 h153: divider 1 #eaecf0; header @13: "5-year preview" Bold 14 (17h) · "Capped at 100%" 12 #667085 right; bars @42: 5 cols 117.4 pitch 129.4: value 12 @0 (center; green at 100%) · pvtrack 44×72 @(36.7,20) fill h = 72·pct/100 bottom-aligned (light primary-100; solid primary at 100%) · "Year n" 11 #667085 @98
