# List screen 2111:10733 — measured spec (1920×1080, app shell provides side nav 118w + top nav 48h)
Content origin x=142 (118+24), toolbar y=72 (48+24); content width 1754; page bg #f9fafb (gray-50).
## Toolbar (2111:10812) 1754×40, justify-between
- Search 367×40: border 1px #d0d5dd r4 white; icon `search-refraction` 16 at left 8, gap 8; placeholder Gilroy Medium 12 #d0d5dd "Search anything here"
- gap 12 → Filter 40×40: border #d0d5dd r4, p12, icon `filter-funnel-01` 16 (#667085)
- Create: bg primary #22c882 r4, px24 py11 (h40), gap 6, `plus` 12 white, Gilroy SemiBold 14/18 white "Create New Contract"
## KPI row (2111:10844) y=136, 5 × Card 334×80, gap 20 (x 0/354/709/1064/1419)
- Card: white, border #eaecf0, r6, px14 py16, gap 12; Avatar 48 circle tinted (total: info-lightest #e6f2fc), icon 22 (`file-06`…); text col h48 justify-between: label Gilroy Medium 14/20 #475467 capitalize; value Gilroy SemiBold 22/32 black
## Card grid (2111:10886) y=236, 3 cols × 569w, col gap 24, row gap 24, card h192
- Card (2111:10888): white, border #eaecf0, r6, px18 py16, col gap 16
- Head block gap 8: row1 justify-between → title Gilroy SemiBold 20 #101828 | right gap 12: expiry Gilroy Medium 11 #344054 ("Expires in 45 days"; red #f04438 when ≤15d per shot) + badge bg #12b76a p8 r4 text Gilroy SemiBold 14 white tracking 1px uppercase (EXPIRING = #f79009, DRAFT = #98a2b3)
- Chip row gap 4, chips h26 r3: `#` chip bg #f2f4f7 px10 py8 gap4, `hash-02` 12 (rotate 180) + SemiBold 12 #667085 · BEEAH chip bg rgba(39,154,255,.13) pl10 pr12 py6 gap6, 20px circle #279aff "B" SemiBold 10 white + SemiBold 12 #101828 · Lot chip bg rgba(226,126,96,.13) pl10 pr12 py6 gap6, `skew` 16 + SemiBold 12 #101828
- Meters block pt2, rows gap 14, row = 2 meters gap 22; meter col gap 7: head justify-between → icon 20 (`users-02`/`car-01`/`tool-02`/`trash-03`) gap4 label Gilroy SemiBold 14/21 #667085 capitalize | value SemiBold 13 #101828 + "/120" #98a2b3; bar h6 bg #eaecf0 r60, fill #22c882 (≥85%) / #f79009 (55–85) / #f04438 (<55)
