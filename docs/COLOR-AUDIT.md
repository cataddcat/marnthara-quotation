# 🎨 COLOR AUDIT — ตรวจสีทั่วทั้งแอป (ข้ามธีม + AA + ตรงทะเบียน)

> Ledger ถาวรกัน "ได้หน้า(light)ลืมหลัง(dark/colorful)". อัปเดตหลังจบ**ทุกก้อน**. resume ข้ามเซสชันได้.
> คู่กับ `DESIGN.md §2/§2.1` (ทะเบียนสี) + memory `tailwind-dynamic-class-gotcha`.

## เกณฑ์ตรวจต่อไฟล์ (5 ข้อ)
1. **palette inline ไม่มี `dark:` คู่** → พังธีมมืด (ตัวชี้หลัก)
2. **ควรเป็น token ทะเบียน** (`DATA_TONE_*`/`STATUS_*`/`MENU_ICON_TONE`/`MATERIAL_*`/`room-accents`) แต่ประดิษฐ์ inline → แทน
3. **hue ผิดความหมาย** §2.1 (เขียว=เงินเท่านั้น · dimension = blue แท้ ห้าม sky/cyan · ทุน=rose …)
4. **AA**: text ≥4.5 / icon ≥3.0 บนพื้นจริง ครบ 5 ธีม (light·signature·dark·eeert·dark-vivid)
5. **print = กระดาษขาว → exempt**

## Legend สถานะ
`⬜ ยังไม่ตรวจ` · `🔍 ตรวจแล้ว–สะอาด` · `🔧 ต้องแก้` · `✅ แก้แล้ว` · `⛔ exempt`

5 ธีมและคลาส: `light`(:root) · `signature`(สืบทอด :root) · `dark`(.dark) · `eeert` · `dark-vivid`(.dark + .dark-vivid).
→ กฎลัด: palette inline ต้องมี **`dark:`** (สำหรับ dark/dark-vivid); base ใช้กับ light/signature/eeert (พื้นอ่อน); `eeert:` = enhancement.

---

## ก้อน 1 — Sources (ทะเบียน = ความจริง, ตรวจก่อน)
| ไฟล์ | จุด | สถานะ | หมายเหตุ |
|---|--:|:--:|---|
| `config/dataTones.ts` | 57 | ✅ | **แก้:** `MATERIAL_ACCENT` ทั้ง 5 ตก AA บน plate light → fabric violet-700 · sheer violet-600 · wallpaper orange-700 · **area teal-700 · hardware sky-700** (+`dark:`). DATA_TONE/PILL/MENU_ICON (ไอคอน/tint) คงเดิม |
| `lib/room-accents.ts` | 40 | 🔍 | avatarText/tag = `-700 dark:-300` ครบ; dot/stripe สีล้วน OK |
| `lib/status-style.ts` | 2 | 🔍 | STATUS_DOT สีล้วน (dot) ไม่ต้อง dark: |

## ก้อน 2 — UI primitives (`components/ui/`)
| ไฟล์ | จุด | สถานะ | หมายเหตุ |
|---|--:|:--:|---|
| `Badge.tsx` | 6 | 🔍 | success = `emerald-500/10 + emerald-600 dark:-400`; variant อื่นใช้ token (bg-primary/destructive) |
| `Alert.tsx` | 4 | 🔍 | info/warn/success/error มี `dark:`+`eeert:` ครบ |
| `AlertDialog.tsx` | 1 | 🔍 | `bg-slate-900/40` = scrim overlay มาตรฐาน (มืดทุกธีม) OK |
| `Select.tsx` | 1 | ✅ | chevron `text-slate-500` → `text-muted-foreground` (token, theme-aware) |
| `OpeningStyleSelector.tsx` | 1 | 🔍 | comment เก่า; ใช้ token แล้ว |
| `ItemSummaryCard.tsx` | 4 | 🔧 | amber/emerald-**600** บน plate -50 ≈ 3.3–3.8:1 (ตก AA) — **ดู §systemic** |
| `FormSection.tsx` | 1 | 🔍 | `blue-600 dark:-400` (ไอคอน section, graphical 3:1) OK |
| `CostReadout.tsx` | 2 | ✅ | `text-amber-500` (ไม่มี dark:, ~1.9:1) → `amber-700 dark:-400`. emerald-600 = systemic |
| `GlobalErrorGuard.tsx` | 4 | 🔍 | มี `dark:` ครบ; กล่อง stack `bg-slate-950` มืดตั้งใจ (เหมือน terminal) |

## ก้อน 3 — Cards & layout
| ไฟล์ | จุด | สถานะ | หมายเหตุ |
|---|--:|:--:|---|
| `components/features/ItemCard.tsx` | 3 | 🔍 | สี = `TYPE_CHIP_PLATE` (brand) + `text-foreground` — ผ่านแล้ว |
| `components/features/RoomCard.tsx` | 5 | ✅ | emerald-600→700 · amber-600/500→700+dark (ยอด/ค้าง/พัก) |
| `components/features/RoomDashboard.tsx` | 3 | ✅ | amber-600→700 · emerald-600→700 |
| `components/features/SmartNavigator.tsx` | 2 | ✅ | amber-600→700 · amber-500→700+dark |
| `components/features/ConflictBanner.tsx` | 6 | 🔍 | icon amber-600 (3:1) + ปุ่ม amber มี dark: ครบ |
| `components/layout/MainLayout.tsx` | 6 | ✅ | amber-600→700 · emerald-600→700 |

## ก้อน 4 — Feature forms
| ไฟล์ | จุด | สถานะ | หมายเหตุ |
|---|--:|:--:|---|
| `features/curtains/components/sections/ProModeControl.tsx` | 21 | ⛔ | dashboard มืดตายตัว (`bg-slate-900`) — slate/emerald-400 ถูกต้องทุกธีม (จงใจ) |
| `features/curtains/components/sections/CurtainCostAnalysis.tsx` | 6 | ⛔ | wrapper มืด `bg-slate-900 text-slate-100` (จงใจ) |
| `features/curtains/components/sections/FabricSection.tsx` | 13 | ✅ | amber-600(input)→700 · amber-500(save btn)→600+dark. Check icon emerald-600 (3:1) ปล่อย |
| `features/curtains/components/sections/CurtainForm.tsx` | 1 | ✅ | badge emerald-600→700 |
| `features/curtains/components/sections/{LayerSelector,HardwareSection,DimensionSection}.tsx` | 4 | 🔍 | token/brand; HardwareSection emerald-500/40 = decorative ปล่อย |
| `features/wallpapers/WallpaperForm` ·  roller/vertical/partition/removal | 9 | 🔍 | สี = brand (theme.text/icon) + `hover:text-red-500` (ลบ, conventional) |
| `features/wooden-blinds/**` · `features/pleated-screen/**` | 0 | 🔍 | grep 0 hit — ไม่มี raw color |

## ก้อน 5 — Modals (`components/modals/`)
| ไฟล์ | จุด | สถานะ | หมายเหตุ |
|---|--:|:--:|---|
| `FinancialDashboard/MoneyTab.tsx` | 11 | ✅ | emerald-600→700 (×4, +dark) · rose-600 คงไว้ (ผ่าน) |
| `FinancialDashboard/constants.ts` | 8 | ✅ | STATUS_STYLE badge: amber/emerald-600→700 + เติม `dark:` ครบ 4 สถานะ |
| `FinancialDashboard/FinancialDashboardModal.tsx` | 2 | ✅ | amber/emerald-600→700+dark (ค้างเก็บ) |
| `FinancialDashboard/ItemCard.tsx` | 2 | 🔍 | ใช้ STATUS_STYLE/token |
| `MaterialSummaryModal.tsx` | 12 | ✅ | emerald-600→700 (×5) · teal-600→700 (×4) · icon amber/emerald-500→600+dark |
| `ProductionSettingsModal.tsx` | 6 | ✅ | amber-500/600→700+dark · emerald-600/70→700/70 |
| `FormulaDocsModal.tsx` | 5 | ✅ | iconColor -500/-600→-600+dark (5 section icons) |
| `LookbookModal.tsx` | 13 | ✅ | note amber-600→700+dark (อื่นเป็น token/brand) |
| `ProjectOverviewModal.tsx` | 3 | ✅ | emerald-600→700 (×2) |
| `JobsModal.tsx` | 3 | ✅ | amber-600→700 (ค้างเก็บ) |
| `CodeDetailModal.tsx` | 2 | ✅ | emerald-600→700 (ทุน) |
| `MainMenuModal.tsx` | 4 | 🔍 | icon emerald/amber-600 (3:1 ผ่าน) + hover — ปล่อย |
| `ItemModal · DiscountModal · CopySummaryModal` | 4 | 🔍 | token/brand (grep ไม่เจอ -500/600 data) |

## ก้อน 6 — Print (`components/print/parts/`) — exempt-candidate (กระดาษขาว)
| ไฟล์ | จุด | สถานะ | หมายเหตุ |
|---|--:|:--:|---|
| ทั้งโฟลเดอร์ `print/parts/*` (8 ไฟล์, ~75 จุด) | 75 | ⛔ | **exempt** — เอกสาร PDF/พิมพ์ = กระดาษขาวเสมอ ทุกธีม; สี (slate/red-500/ฯลฯ) จงใจคงที่สำหรับงานพิมพ์ ไม่ผูกธีม |

## ก้อน 7 — Misc/hooks
| ไฟล์ | จุด | สถานะ | หมายเหตุ |
|---|--:|:--:|---|
| `hooks/useSyncStatus.ts` | 2 | 🔍 | `dotClass: bg-amber-500/emerald-500` = dot สีล้วน ไม่ต้อง dark: |

---

## ✅ ประเด็นเชิงระบบ (systemic) — **P1 อนุมัติ + ทำครบทั้งแอปแล้ว**
inline `text-emerald-600`/`text-amber-600`/`text-amber-500` (data text) บนพื้นขาว/tint ตก AA (3.18–3.76:1) →
มาตรฐานเป็น **`-700` (คง `dark:-400`)** ทั้งแอป. ยืนยัน WCAG: emerald-700=5.48 · amber-700=5.02 · teal-700=5.25 ·
sky-700=5.57 (บนขาว). **คงไว้ไม่แตะ:** `rose-600`=4.70 ผ่าน · ไอคอน `-600` (3:1 ผ่าน) · registry icon-tone ·
decorative (`/40 /70`) · hover · solid dot/bg · scrim · print(กระดาษ) · **ProModeControl/CurtainCostAnalysis = dashboard มืดตายตัว (จงใจ) = exempt**.

## ⭐ AAA upgrade — EEERT + Dark Vivid (จุดเด่น 2 ธีม vivid)
ทั้ง 2 ธีมยกเป็น **AAA (text ≥7:1)**; ธีม light/signature/dark คง AA. ทิศ: EEERT พื้นเกือบขาว → `eeert:` ลึก
(-800/-900); Dark Vivid พื้นมืด → สว่าง (`dark:`-400 ส่วนใหญ่ AAA, rose ใช้ `dark-vivid:rose-300`).
- **Brand** (`index.css`): EEERT เข้มขึ้น 7 สี · Dark Vivid สว่างขึ้น screen/removal → AAA (worst 7.10 / 7.02).
- **ทะเบียน**: `MATERIAL_ACCENT.wallpaper eeert:orange-900`; `DATA_TONE_TEXT.cost +dark-vivid:rose-300`. eeert: -800/-900 อื่น AAA อยู่แล้ว.
- **inline + chip + room-accents**: เติม `eeert:text-X-800` (amber/orange = `-900`) ทุก data-text/-chip `-700`
  (sweep + เก็บ chip `bg-X-50` + room-accents 8 สี). ยืนยัน WCAG eeert shade ทุกตัว ≥7.2.
- **เก็บตก:** MoneyTab bare `rose-600` เติม `dark:` (เดิมตก AA ในธีมมืด) + full cost variants.
- คงเว้น: ไอคอน · decorative `/40 /70` · print · ProMode dark dashboard.

## 📋 บันทึกการแก้ (changelog)
- **ก้อน 1 (sources):** `dataTones.ts` `MATERIAL_ACCENT` fabric `violet-500→700`, sheer `violet-400→600` (+`dark:-300`), wallpaper `orange-500→700` (+`dark:-400`) — ปิดช่อง AA ในธีม light/signature (เดิม 2.5–3.9:1). dot/pill/plate คงเดิม.
- **ก้อน 2 (primitives):** `CostReadout` `amber-500→amber-700`; `Select` chevron `slate-500→muted-foreground`.
- **P1 sweep (ก้อน 1–5):** เลื่อน data-text `-600→-700` (+`dark:-400` ที่ขาด) ทั้งแอป:
  - **registry:** `MATERIAL_ACCENT` ครบ 5 (fabric/sheer/wallpaper/area/hardware).
  - **primitives:** Badge success · ItemSummaryCard (title/override/set-price) · CostReadout.
  - **cards/layout:** RoomCard · RoomDashboard · SmartNavigator · MainLayout.
  - **forms:** CurtainForm · FabricSection.
  - **modals:** MoneyTab · FinancialDashboard/{constants,Modal} · MaterialSummaryModal (emerald+teal) · ProductionSettings ·
    ProjectOverview · JobsModal · CodeDetail · Lookbook · FormulaDocs(icons).
  - **เว้น:** rose-600 (ผ่าน) · ไอคอน-600 (3:1) · registry icon-tone/pill · decorative · hover · print · ProMode dark dashboard.
- **WCAG verify:** ทุกค่า -700 ที่บั๊ม ≥ 5.0:1 บนขาว/plate (emerald 5.48 · amber 5.02 · teal 5.25 · sky 5.57 · violet-600 icon 5.70).
