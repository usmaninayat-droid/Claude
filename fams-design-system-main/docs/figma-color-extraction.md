# Figma Design System V2 — Color Primitives & Color Tokens (authoritative)

Source: figma.com/design/4FS7S3tHKzZZpdFBA0aGkt — extracted 2026-08-25 directly from the file's
variable manager via the Plugin API (NOT the documentation frames, which are stale).

Collections: **Primitives** (284, 1 mode) · **Color Tokens** (125, modes: FAMS V5 / Tadweer / Qatar MME / EAD / DMT)
· Size (35, Desktop/Mobile) · Responsive (1, 6 modes).

## 1. Primitives (collection "Primitives")

### Brand ramps (10 steps: 50,100,200,300,400,500,600,700,800,900)
| Step | Fams | Tadweer Primary | Tadweer Secondary | Qatar MME | EAD | DMT |
|---|---|---|---|---|---|---|
| 50 | #E6F2FC | #E9FAF3 | #CDE5F7 | #F9EBEF | #E6EDF3 | #F1FAFF |
| 100 | #CCE6F9 | #BAEED8 | #B1D6F2 | #F2D1DB | #B0C7DA | #D3E8F3 |
| 200 | #99CDF3 | #99E6C6 | #8CC3EC | #E7A7BA | #8AACC8 | #9CCBE3 |
| 300 | #66B5ED | #43D095 | #68B0E6 | #D9688A | #5486AF | #70B5D7 |
| 400 | #339CE7 | #43D095 ⚠️dup | #2A90DB | #BA2653 | #336F9F | #449ECB |
| 500 | **#0072D6** | **#22C882** | #047CD5 | **#6E112D** | **#004B87** | **#238DC2** |
| 600 | #005CB0 | #1DAA6F | #247ABA | #5C0C24 | #00447B | #1E78A5 |
| 700 | #00478A | #15794F | #195683 | #4B091D | #003560 | #175C7E |
| 800 | #003165 | #0F5135 | #113A58 | #3A0615 | #00294A | #103F57 |
| 900 | #001C3F | #082A1C | #081D2C | #2A030F | #002039 | #071C27 |

⚠️ `Color/Tadweer/Primary/300` and `/400` are both #43D095 in the file — likely a data-entry slip.

### Neutral
Base/white #FFFFFF · Base/black #000000
Gray Modern 50 #F9FAFB · 100 #F2F4F7 · 200 #EAECF0 · 300 #D0D5DD · 400 #98A2B3 · 500 #667085 · 600 #475467 · 700 #344054 · 800 #1D2939 · 900 #101828

### Support ramps (10 steps each; 500 shown, full ramps in file — all standard Untitled-UI-style scales)
| Family | 50 | 100 | 500 | 700 | 900 |
|---|---|---|---|---|---|
| Blue (== Fams brand) | #E6F2FC | #CCE6F9 | #0072D6 | #00478A | #001C3F |
| Green | #ECFDF3 | #D1FADF | #12B76A | #027A48 | #054F31 |
| Orange | #FFFAEB | #FEF0C7 | #F79009 | #B54708 | #7A2E0E |
| Red | #FEF3F2 | #FEE4E2 | #F04438 | #B42318 | #7A271A |
| Cyan | #ECFEFF | #CFFAFE | #06B6D4 | #0E7490 | #164E63 |
| Azure | #EFF6FF | #DBEAFE | #3B82F6 | #1D4ED8 | #1E3A8A |
| Gray Blue | #F3F5FC | #E6E9F7 | #4E5BA6 | #353F73 | #1A203A |
| Lavender | #F9F5FF | #F4EBFF | #9E77ED | #6941C6 | #42307D |
| Plum | #FDF4FF | #FAE8FF | #D946EF | #A21CAF | #701A75 |
| Pink | #FDF2FA | #FCE7F6 | #EE46BC | #C11574 | #851651 |
| Rose | #FFF1F3 | #FFE4E8 | #F63D68 | #C01048 | #89123E |
| Lime | #F7FEE7 | #ECFCCB | #84CC16 | #4D7C0F | #365314 |
| Aqua Green | #E0FCF9 | #B3F5ED | #14B8A6 | #0D776E | #063F39 |
| Flame | #FFF7F0 | #FFEAD5 | #FF6A1A | #B74300 | #661F00 |
| Yellow | #FFF9E8 | #FAF3E1 | #F5BB2A | #B78314 | #6E4D0B |
| Bronze | #F9F5F1 | #EEDFCF | #8B6439 | #5C3920 | #2F180F |

### Numbers
0–100 in steps of 2, plus Max=1000 (52 number primitives used by Size/Responsive/typography).

## 2. Color Tokens (125, per-tenant modes)

### Shared across ALL tenants (aliases to Neutral/Support primitives)
- **Base**: White→Base/white, Black→Base/black
- **Surface**: Primary→white · Minimal→Gray Modern/50 · Low_contrast→Gray Modern/200
- **Border**: Lightest 200 · Light 300 · Normal 400 · Dark 700 · Darkest 900 (Gray Modern)
- **Neutral**: Lightest 50 · Lighter 200 · xLight 300 · Light 400 · Normal 500 · Dark 600 · Darker 700 · Darkest 900
- **Default Text**: Lightest 50 · Lighter 400 · Light 500 · Normal 600 · Dark 700 · Darker 800 · Darkest 900
- **Transparent/White & /Black**: 20/40/60 (#fff / #000 at .2/.4/.6)
- **Accents** (Lightest→50, Light→100, Normal→500, Dark→700, Darkest→900 of the Support ramp):
  Error→Red, Warning→Orange, Cyan, Azure, GrayBlue, Lavender, Plum, Pink, Rose, Lime, AquaGreen, Flame, Yellow, Bronze

### Tenant-varying
**Brand/Primary** (Lightest/Light/Normal/Dark/Darkest → brand 50/200/500/700/900):
FAMS→Fams · Tadweer→Tadweer Primary · Qatar MME→Qatar MME · EAD→EAD · DMT→DMT ✅ each properly bound.

**Brand/Secondary**: FAMS→Fams Primary (no separate secondary) · Tadweer→**Tadweer Secondary** (blue ramp) ·
Qatar MME/EAD/DMT→their own Primary ramp.

**Surface/Secondary**: FAMS→Fams/50 · Tadweer→Tadweer/50 · Qatar MME→QatarMME/50 ·
⚠️ **EAD and DMT also alias Qatar MME/Primary/50 (#F9EBEF pink)** — almost certainly a mis-binding; should be EAD/50 and DMT/50.

**Transparent/Brand** (20/40/60 = brand-500 at alpha):
FAMS #0072D6 · Tadweer #22C882 · Qatar MME #6E112D · EAD #004B87 · DMT #238DC2 ✅ all correct.

**Accent/Success** — Tadweer mode remaps to Tadweer Primary greens (50/100/500/700/**800**) instead of Support/Green; all other tenants use Support/Green. (Darkest→800 not 900 — check if intentional.)

**Accent/Info** — EAD and DMT remap to their own brand ramps; FAMS/Tadweer/Qatar MME use Support/Blue.

## 3. vs repo (`packages/tokens/tokens/tenants/`)
| Figma mode | 500 | Repo tenant | Repo primary | Verdict |
|---|---|---|---|---|
| FAMS V5 | #0072D6 | fams | #0072D6 | ✅ match |
| Tadweer | #22C882 | iwmp | #22C882 | ✅ match |
| EAD | #004B87 | ead | #004B87 | ✅ match |
| Qatar MME | #6E112D | uccp | #6E112D | ✅ same color — repo calls it "uccp", Figma "Qatar MME" (naming only) |
| DMT | #238DC2 | — | — | ❌ missing in repo |

Repo tenant files carry only flat primary/secondary values; Figma now defines full 10-step ramps,
per-tenant secondary (Tadweer blue), Transparent/Brand alphas, and the Success/Info accent remaps —
none of which are in code yet.

## 4. Issues to fix in Figma (found during extraction)
1. Surface/Secondary mis-bound for EAD + DMT (points at Qatar MME/50).
2. Tadweer Primary/300 == /400 (#43D095 duplicated).
3. Accent/Success Darkest in Tadweer mode → Primary/800 (others use 900) — confirm intent.
4. Documentation frames on the "Tokens & Styles" page are stale (Qatar MME/EAD/DMT columns still show Tadweer aliases) — regenerate them from the variables.
