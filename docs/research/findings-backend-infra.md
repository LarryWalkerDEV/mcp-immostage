# Research Findings — backend/infra

Compounding store of validated research findings from issues in category
`backend/infra`. Read this before re-deriving repo facts for a new issue in
this category. Append a new dated section per issue; never rewrite history.

## 2026-07-01 — Issue #4: Truthful server instructions, uniform quota wording, surface skipped features

**Goal:** Make the ImmoStage MCP server describe itself truthfully — its instructions currently promise "Social-Media-Kit/Video in Kürze" while simultaneously telling the model to call `generate_marketing` which already delivers them, and quota wording must uniformly say "3 kostenlose Bilder" — and turn silent plan-gated feature skips (e.g. video on trial/starter) into an explicit German upgrade hint with checkout URL. Net effect: a German Immobilienmakler using the connector is never misled about what exists, never waits for a video that will silently never arrive, and every denial becomes a transparent upsell moment.

**Matched skills:** `[]` (none — backend/infra issues use repo-grounded research, not skill/web research).

### Playbook structure

1. **Fix the self-contradiction (two files, same text):** `src/server.ts`
   `INSTRUCTIONS` (line ~15 options bullet vs. step 5) and `skill/SKILL.md`
   ("Optionen anbieten" section, line ~27) both list "Grundriss-Verschönerung,
   Video, Social-Media-Kit (in Kürze)" while their own workflow step tells the
   model to call `generate_marketing`, which already delivers social kit +
   exposé + video. Correct state today: Virtuelles Staging + Marketing-Paket
   (Social-Posts, Exposé-PDF, Video — Video nur im Pro-Plan) verfügbar; NUR
   Grundriss-Verschönerung is "in Kürze".
2. **Quota wording sweep:** uniform "3 kostenlose Bilder" across `server.ts`
   instructions, tool descriptions, and `skill/SKILL.md` (current variants:
   "Die ersten 3 Bilder sind kostenlos", "3 Bilder kostenlos",
   "Die ersten **3 Bilder pro Konto** sind kostenlos").
3. **Parse `skipped[]` in `src/tools/generate-marketing.ts`:** the app's
   `/api/mcp/generate` (built in parallel in immostage-3d #27 — build against
   the fixed contract, do not wait for it) returns
   `skipped: [{ feature, reason, upgradeUrl }]`. When present, append a German
   note per skipped feature, e.g. "Hinweis: Das Immobilien-Video ist im
   Pro-Plan enthalten. Jetzt upgraden: {upgradeUrl}". Tolerate absence of
   `skipped` (backward compatible — today's text unchanged).
4. **Unit test (repo's first):** mocked app response with
   `skipped:[{feature:'video',reason:'pro_required',upgradeUrl:'https://x'}]`
   asserts hint + URL in tool text; mocked response without `skipped` asserts
   today's text.
5. **Verify:** `npx tsc --noEmit` exit 0; `npm test` (vitest) green.

### Success criteria

- Instructions describe only what exists today; no contradiction between the options list and the workflow steps, in BOTH `src/server.ts` and `skill/SKILL.md`.
- "3 kostenlose Bilder" uniform everywhere user/model-facing.
- `generate_marketing` output surfaces every skipped feature as a German upgrade hint with the checkout URL; no silent skips.
- Unit test covers both `skipped`-present and `skipped`-absent paths; `npx tsc --noEmit` exits 0.
- Guardrails: all user-facing text German; do NOT register the deferred Phase-F tools.
- Makler acceptance gate (added by founder, applies to every review iteration): judge output as a German Immobilienmakler — correct professional German (Sie-Form, no anglicisms, no truncated umlauts), correct prices/units (€, m², Zimmer). "Borderline" = not approved; max 3 iterations, then leave open with the Makler objection listed.

### Validated repo facts (reusable for future MCP-server issues)

- **Instructions live in one string constant:** `src/server.ts` `INSTRUCTIONS`,
  passed to `new McpServer(..., { instructions })`. A fresh server is built per
  request (stateless transport); the validated Bearer key is threaded into every
  tool registration.
- **The skill duplicates the instructions:** `skill/SKILL.md` (distributable
  Claude skill) restates options, workflow, and billing wording. Any
  instructions change is a TWO-file change — server.ts alone leaves the skill
  contradicting the server.
- **`generate_marketing` is a two-step proxy:** `/api/mcp/project` (resolve
  `property_name` → `projectId`) then `/api/mcp/generate`, both via
  `callApp()` from `src/lib/app-client.ts`. Response shape it parses today:
  `{ started?: string[], note?, error? }` — no `skipped` handling existed
  before this issue.
- **Cross-repo contract:** `skipped[]` shape
  `{ feature: 'video', reason: 'pro_required', upgradeUrl: 'https://...' }`
  is fixed and owned by immostage-3d #27 (app side). MCP side codes against
  the contract, tolerating absence.
- **Phase-F tools exist but must stay unregistered:** `floor-plan.ts`,
  `classify-room.ts`, `optimize-listing.ts`, `suggest-style.ts` sit in
  `src/tools/` but are NOT registered in `createServer()` — they still call
  kie.ai directly (standalone, unbilled); registering them reopens the cost
  leak. Registration happens in Phase F only.
- **Test infra:** `vitest ^3.0.5` is in devDependencies and `npm test` =
  `vitest run`, but the repo had ZERO test files before this issue — the
  `generate_marketing` unit test is the first; mock `callApp` from
  `src/lib/app-client.ts`.
- **Quota "3 kostenlose Bilder" is enforced app-side** (immostage-3d), not in
  this repo — this repo only carries the wording. The canonical app-side string
  locations are documented in immoapp's `docs/research/findings-backend-infra.md`
  (issue #25 section). A quota change is only done when BOTH repos are swept.

### Critic opportunities / surprises (including not implemented this round)

- **Surprise:** the contradiction is self-inflicted drift — `generate_marketing`
  shipped (commit `02b5cf5`) without updating the options bullet written when
  the features genuinely were "in Kürze". Any future tool addition/removal must
  touch the options list + workflow steps + SKILL.md as one unit.
- **Opportunity (not implemented):** single source of truth for the
  capability list — generate the options bullet in `INSTRUCTIONS` and the
  SKILL.md "Optionen anbieten" section from one shared constant/manifest of
  registered tools, so server text can never contradict what is registered.
  Eliminates this entire drift class (same pattern as the `TRIAL_FREE_IMAGES`
  constant opportunity from immoapp issue #25).
- **Opportunity (not implemented):** generalize the `skipped[]` upgrade-hint
  rendering — today only `generate_marketing` parses it, and only
  `pro_required` has wording. When Phase F registers floor-plan etc., every
  plan-gated tool should share one `renderSkippedHints(skipped[])` helper with
  a reason→German-copy map, instead of re-implementing per tool.
- **Opportunity (not implemented):** contract test against the real app —
  the unit test mocks the `/api/mcp/generate` response; nothing catches the
  app changing the `skipped[]` shape. A cross-repo contract fixture (shared
  JSON in both repos, or a smoke test against staging) would catch drift
  mechanically.
- **Opportunity (scope addition landed on this issue, cross-cutting):**
  `get_download_link` must present BOTH delivery channels — the 3-day share
  URL (instant, forwardable to the seller) AND the permanent dashboard home
  `https://app.immostage.ai/projects/<projectId>` ("Login erforderlich",
  note the 3-day expiry of the first link). If `/api/mcp/share` doesn'
