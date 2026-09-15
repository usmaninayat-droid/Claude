# Wizard shell + stepper (2111:1925 / 2111:2185) — measured
Backdrop rgba(0,0,0,.4) over app. Panel "Auto Detect Area": 1740w × 1080h, right:0, bg #f9fafb, r8, flex row.
Close ×: 58px white circle w/ shadow (asset group1000002614 = circle + x), 40px gap left of panel, vertically centred (y≈510).
## Rail (left) 326w, p28, gap24, bg #f9fafb
- Title "Create New Contract" Gilroy Bold 24/33 black, pb6
- Steps column gap 6. Step row: gap 9, marker 32 + text col (STEP n / title)
  - pending: ring 1.09px #d0d5dd r-full 32, icon 17.45 #667085 (p7.27); "STEP n" Bold 10 tracking .5 #667085; title Medium 14 #98a2b3
  - active: ring 1px primary-light (tenant light green) 32, inner 26 circle bg primary, icon 16 white; "STEP n" Bold 10/12 primary; title SemiBold 14 #1d2939
  - done: 32 circle bg rgba(34,200,130,.22), `check` 18 primary; labels as pending
  - connector between rows: 2×32 (h32) rounded-2, #d0d5dd; after a done step rgba(34,200,130,.22)
- Icons: 1 list · 2 marker-pin-04 · 3 truck-02 · 5 tool-02 · 6 users-02 · 7 trash-03 · 8 coins-hand · 9 target-04 · 10 attachment-01 · final align-left
## Main pane (right) flex-1, bg white, border-left 1px #ededed, p28, col gap 28
- Content col gap 20: section title Gilroy Bold 18 black; body
- Footer row justify-between: "Back" SemiBold 18 black (opacity 0 on step 1) · primary btn 232×48 px28 py13 r4 bg primary, SemiBold 18 white ("Save and Continue" / "Create")
## Fields (Basic Info) — 2-col grid gap 24 (rows gap 24)
- Field 56h white border #d0d5dd r4 p8; label SemiBold 10 #98a2b3 (leading 0 → sits at top) + gap 4 + value SemiBold 16 black; required "*" #f04438; "(optional)" #d0d5dd; select → chevron-down 12 right; date/person fields: leading icon 20 (calendar/user-03) gap 10; Start Date has clear `x` 12 (#f04438) at right
- Full-width last row (Project Manager)
## Zone step body
- Map frame: w100% h766 border #d0d5dd r8 overflow hidden; bg = assets/zone-map.png (object-fit cover, Figma crop: img h160.18% top-23.63% w108.78%)
- Polygon overlay assets/zone-polygon.svg: box 616.6×649 at left131 top-1 (rotated 51.46°, inner 552.6×348.1)
- Zone field 554×56 abs (11,11): label "Zone *" SemiBold 12 #98a2b3; chip LOT-01 bg rgba(186,238,216,.23) border #e6f1fb r16 px8 py2 SemiBold 12 primary + x 8; chevron-down 12 right
- Layers btn 40×40 abs top11 right11 r6: layers-thumb.png + rgba(0,0,0,.28) overlay, layers-three-01 20 white, shadow 6px 10px 12px rgba(0,0,0,.05)
- Zoom stack abs bottom11 right11 w40 gap12: white 40×70 r6 p7 col justify-between (plus 20 · divider 26×1.3 #eaecf0 · minus 20) · maximize-02 40×40 white r6 p10
