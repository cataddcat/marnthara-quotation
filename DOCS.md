# 🗺️ DOCS.md — Documentation index

The single entry point to every doc in this repo. Read the 🔴 tier always; drop into the 🟡/🟢 tiers by task.

## 🔴 Always loaded — the contract
| Doc | Defines / role | Answers |
|---|---|---|
| **[CLAUDE.md](CLAUDE.md)** | Master instructions for AI agents — project overview, command index, architecture map, rules, doc conventions. Auto-loaded every session. | "Where do I start? What can/can't I do?" |
| **MEMORY.md** *(agent memory store — not in repo)* | One-line index of cross-session memories (preferences, decisions, project state). Auto-loaded. | "What did we agree / prefer in past sessions?" |

## 🟡 Required reading — by task
| Doc | Defines / role | Read before |
|---|---|---|
| **[PRINCIPLES.md](PRINCIPLES.md)** | Product decision principles — the single-shop-owner persona, the 5 non-negotiables, the QOL Decision Test. | adding / changing a **feature** ("should we?") |
| **[CONTEXT.md](CONTEXT.md)** | Domain **glossary** — ผ้าทึบ, DOUBLE, Style, ลอน… Use these exact terms; no code/paths. | discussing any feature/bug ("what is X?") |
| **[HANDOFF.md](HANDOFF.md)** | Deep **technical** handoff — design philosophy (save-first, cost priority chain), system map, invariants, cost/catalog model, bug history. | architectural / pricing / save-flow / multi-file changes ("how & why is it built?") |
| **[DESIGN.md](DESIGN.md)** | The **design system & UI** requirements ("the document is the designer") — typography, colour (*colourful data · monochrome chrome · high contrast*), spacing, the Design Probe, enforcement. | any UI/UX change ("how should it look?") |
| **[COMMANDS.md](COMMANDS.md)** | Every project **command** + the verification gate (lint 0-warn · test · build) + expected output. | running anything / before handoff |

## 🟢 Reference — situational (not normally read)
| Doc | Role |
|---|---|
| **[MUTATION_TESTING.md](MUTATION_TESTING.md)** | How/why to run Stryker mutation testing on the pricing core (on-demand, not in CI). |
| **[docs/archive/DESIGN-AUDIT.md](docs/archive/DESIGN-AUDIT.md)** | 🗄️ Archived one-time audit of the external "Marnthara Design System" bundle (→ 0 code changes). History only. |
| **[docs/report/lighthouse.md](docs/report/lighthouse.md)** | Latest raw Lighthouse run (perf / a11y / SEO). Regenerated ad-hoc. |

## 🔒 Single source of truth (don't duplicate — link instead)
To keep docs from drifting/contradicting, **each topic has exactly one owner**. Other files **link**, never
restate. **If two docs disagree, the owner wins — fix the other.**

| Topic | Owner (canonical) | Everyone else |
|---|---|---|
| Commands · verification gate · expected output | **COMMANDS.md** | link; **never** hardcode test counts/versions |
| UI · typography · **colour** · spacing · elevation | **DESIGN.md** | link. §2 = current colour law (*colourful data · monochrome chrome · high contrast*) — **supersedes** HANDOFF §1.7 "monochrome-first / borders-over-shadows / Eye-Care-soft" |
| Product scope · what to build/refuse | **PRINCIPLES.md** | — |
| Domain vocabulary | **CONTEXT.md** | use the terms verbatim |
| Architecture · pricing · invariants · "why" · bug history | **HANDOFF.md** | — |
| Standing preferences · latest decisions | **MEMORY.md** *(agent store)* | — |

> CLAUDE.md is the **auto-loaded index** (overview, rules, command quick-list) — it points to the owners
> above and keeps no authoritative copy of their content.

## Reading order (the layers)
**PRINCIPLES** (should we?) → **CONTEXT** (vocabulary) → **HANDOFF** (how & why) → **DESIGN** (look) —
tied together by **CLAUDE.md** (index + commands) and overlaid by **MEMORY.md** (latest decisions).
