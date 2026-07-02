# 🗺️ DOCS.md — Documentation index

**Primary reader = the AI agent.** These docs exist so an agent can load accurate project context at the
start of every session and keep the work aligned with the project's **philosophy · rules · plan** — fast,
precise, no confusion. The index is therefore designed *strictly* for that. Read the 🔴 tier always; drop
into 🟡/🟢 by task.

> **Hygiene rule (the reason this index stays trustworthy):**
> - **Finished work = delete it, not archive it.** git history is the archive. No `archive/` folder, no
>   completed audits/task-orders/rollout logs living in the tree. A doc earns its place only by *still
>   constraining current work*.
> - A durable lesson from finished work → compress it into an **invariant** (HANDOFF §4) or a **memory**,
>   never leave it as a worklog.
> - **One owner per topic** (table below). Everyone else **links**, never restates. If two docs disagree,
>   **the owner wins — fix the other.**
> - This index must equal the real files on disk: **no missing docs, no broken links.**

## The three pillars (what every doc serves)
| Pillar | Question | Owned by |
|---|---|---|
| **ปรัชญา / Philosophy** | *Should we build this? for whom?* | **PRINCIPLES.md** (+ HANDOFF §1 design philosophy) |
| **กฎ / Rules** | *How must it look / behave / pass?* | **DESIGN.md** (UI) · **COMMANDS.md** (gate) · **CONTEXT.md** + **docs/UX-GLOSSARY.md** (vocabulary) · **CLAUDE.md** (agent rules) |
| **แผน / Plan** | *What's active / next?* | **HANDOFF §6** = บ้านเดียวของ roadmap/หนี้ค้าง (*งานคืออะไร + exit criteria*) · **MEMORY.md** = สถานะล่าสุด (*ทำถึงไหน/ตัดสินใจอะไร*) — สองไฟล์ชี้กัน ไม่ restate กัน |

## 🔴 Always loaded — the contract
| Doc | Role | Answers |
|---|---|---|
| **[CLAUDE.md](CLAUDE.md)** | Master AI instructions — overview, command index, architecture map, rules, doc conventions. Auto-loaded every session. | "Where do I start? What can/can't I do?" |
| **MEMORY.md** *(agent store — not in repo)* | One-line index of cross-session memories (preferences, decisions, **active plan/state**). Auto-loaded. | "What did we agree / what's next?" |

## 🟡 Required reading — by task
| Doc | Role | Read before |
|---|---|---|
| **[PRINCIPLES.md](PRINCIPLES.md)** | Product principles — single-shop-owner persona, the 5 non-negotiables, the QOL Decision Test. | adding/changing a **feature** ("should we?") |
| **[CONTEXT.md](CONTEXT.md)** | Domain **glossary** + copy/voice/anti-terms — ผ้าทึบ, DOUBLE, ลอน… use these terms verbatim. | discussing any feature/bug ("what is X?") |
| **[HANDOFF.md](HANDOFF.md)** | Deep **technical** handoff — design philosophy, system map, invariants (§4), cost/catalog model (§11), multi-job + sync (§12). | architectural / pricing / save-flow / multi-file changes ("how & why is it built?") |
| **[DESIGN.md](DESIGN.md)** | The **design system & UI** law ("the document is the designer") — typography · colour/contrast · spacing · the Design Probe · enforcement (the law + its values live here). | any UI/UX change ("how should it look?") |
| **[docs/UX-GLOSSARY.md](docs/UX-GLOSSARY.md)** | 📐 **UX/UI design-engineering vocabulary** (truncate · natural width · min-w-0 · slack · safe-area …) + the rule **"new term → record it here."** Distinct from CONTEXT.md (domain/business terms). | any UI/UX change (read with DESIGN.md; **record new terms here**) |
| **[COMMANDS.md](COMMANDS.md)** | Every project **command** + the verification gate (lint 0-warn · test · build) + expected output. **Sole owner of test counts/versions.** | running anything / before handoff |

## 🟢 Reference — situational (not normally read)
| Doc | Role |
|---|---|
| **[docs/AI-PLAYBOOK.md](docs/AI-PLAYBOOK.md)** | 📘 Portable principles for using any AI coding agent (token economics, instructions/memory/commands/subagents, the กวาด→เลือก→ยิง combo). Shareable; Marnthara = labelled examples only. |
| **[docs/AI-WORKFLOW.md](docs/AI-WORKFLOW.md)** | 🤖 The applied version for *this* project — the `/probe-fix` · `/doc-name` slash commands + `design-reviewer` subagent + Design Probe (the `.claude/` tooling lives here, not separately indexed). |
| **[MUTATION_TESTING.md](MUTATION_TESTING.md)** | How/why to run Stryker mutation testing on the pricing core (on-demand, not in CI). |
| **[docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md)** | Operator guide — enable cross-device cloud sync (Firebase/Firestore). App works local-only without it. |
| **[docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md)** | Manual "ทุกซอกทุกมุม" QA checklist (📱 390px · 🖥️ desktop), used alongside the automated gate. |
| **[docs/EXTERNAL-CATALOG-TOOL.md](docs/EXTERNAL-CATALOG-TOOL.md)** | Spec for the **separate** catalog-input tool (AI reads LINE → writes Firestore `catalog`). This app is its read-only consumer (HANDOFF §11.8). |
| **[test-data/README.md](test-data/README.md)** | The demo-data JSON suite — import fixtures for exercising every feature/edge case. |

## 🔒 Single source of truth (don't duplicate — link instead)
Each topic has exactly **one owner**. Other files **link**, never restate. **If two docs disagree, the
owner wins — fix the other.**

> **Mirror rule:** the few copies that *must* exist (CLAUDE.md auto-load index · `.claude/` tooling) are
> **mirrors** — labels + pointers only, never the owner's **volatile values** (typography numbers, colour
> names, the gate command, test counts, ordered lists). Volatile values live once at the owner (+ its
> machine mirror: `typography.ts`, `dataTones.ts`). Tag any necessary copy `mirror of <owner>`.

| Topic | Owner (canonical) | Everyone else |
|---|---|---|
| Commands · verification gate · expected output · **test counts** | **COMMANDS.md** | link; **never** hardcode counts/versions |
| UI · typography · **colour** · spacing · elevation · icons | **DESIGN.md** (+ `typography.ts` / `dataTones.ts` mirrors) | link; never copy the numbers/hues. §2 owns the visual language (HANDOFF §1.7 is only a pointer to it) |
| Reading order / doc map | **DOCS.md** (this file) | CLAUDE.md links here — keeps no own order |
| Product scope · what to build/refuse | **PRINCIPLES.md** | — |
| Domain vocabulary (โดเมน/ธุรกิจ) · copy/voice/anti-terms | **CONTEXT.md** | use the terms verbatim; tone = PRINCIPLES §2.5 |
| UX/UI design-engineering vocabulary | **docs/UX-GLOSSARY.md** | link; new term → record here (DESIGN §6) |
| Architecture · pricing · invariants · "why" | **HANDOFF.md** | — |
| Standing preferences · latest decisions · active plan | **MEMORY.md** *(agent store)* | — |

> CLAUDE.md is the **auto-loaded index** (overview, rules, command quick-list) — it points to the owners
> above and keeps no authoritative copy of their content.

## Reading order (the layers)
**PRINCIPLES** (should we?) → **CONTEXT** (vocabulary) → **HANDOFF** (how & why) → **DESIGN** (look) —
tied together by **CLAUDE.md** (index + commands) and overlaid by **MEMORY.md** (latest decisions + plan).
