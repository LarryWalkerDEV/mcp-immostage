# Research Findings — backend/infra

Compounding store of validated research findings from issues in category
`backend/infra`. Read this before re-deriving repo facts for a new issue in
this category. Append a new dated section per issue; never rewrite history.

## 2026-07-01 — Issue #3: check_staging returns staged image inline (restored)

> NOTE: the original section was clobbered in a parallel-write race (commit
> `eda91a6` carries the issue-#3 message but issue-#4 content). Restored from
> the issue, the commit message, and the repo. Reduced fidelity: the critic's
> full opportunity list from that round was lost.

**Goal:** When a staging job completes, `check_staging` shows the staged image
directly in the Claude conversation (MCP `{type:'image'}` content block) PLUS
the existing download-URL text — instead of a URL-only string the Makler has to
click blind.

**Matched skills:** `[]`.

### Playbook structure

1. Reuse the in-repo inline-image pattern: the UNREGISTERED
   `src/tools/floor-plan.ts` (~lines 75-86) already fetches the result and
   returns `{type:'image', data, mimeType}` via `fetchImageAsBase64` from
   `src/lib/image-to-base64.ts`. Apply the same pattern to `check_staging`'s
   completed branch.
2. Preview budget: base64 data <= ~1 MB; if the original is bigger, fetch a
   downscaled variant (Supabase Storage image-transform `?width=1024` or an
   app-provided thumbnail) — the budget is the gate, mechanism is builder's
   choice.
3. Graceful degradation: if the image fetch fails, fall back to today's
   text-only response — never fail the tool because the preview failed.
   In-progress and failed states unchanged (text-only).
4. Unit tests: mocked completed-status response asserts image block + text
   block; mocked fetch failure asserts text-only fallback.

### Success criteria

- Completed job returns `[{type:'image', data:<base64>, mimeType:'image/jpeg'}, {type:'text', text:'Fertig! Download: <url>...'}]`.
- Base64 payload <= ~1 MB; fetch failure degrades to text-only; other states unchanged.
- `npx tsc --noEmit` exit 0; German text; Phase-F tools stay unregistered.

### Validated repo facts (reusable)

- **Inline-image history:** `acfda76` added inline base64 staged images; the
  thin-proxy rewrite `79a0762` (URL-only return) removed them. Issue #3
  reinstates the preview WITH a size budget, on top of the proxy architecture.
- **`fetchImageAsBase64(url): Promise<Base64Image | null>`** in
  `src/lib/image-to-base64.ts` is the existing helper; returns null on failure
  (maps directly onto the graceful-degradation requirement).
- **Registered vs. exported tools differ:** `src/tools/index.ts` exports more
  than `createServer()` registers — the unregistered Phase-F tools are the
  place to mine patterns from, but must not be registered (unbilled kie.ai
  cost leak).
- **`.gitignore` gotcha:** the repo ignored `research/` unanchored, which also
  ignored `docs/research/`. Fixed in `eda91a6` by anchoring to `/research/`.
  If a docs file mysteriously will not stage, check ignore anchoring first.

### Critic opportunities / surprises (partially lost)

- **Surprise:** the "new" feature already existed twice — first shipped
  (`acfda76`), then removed by an architecture change (`79a0762`), pattern
  preserved only in an unregistered tool. Grep git history before building.
- **Process surprise (from this restoration):** two memory agents appending to
  the same findings file in parallel worktrees WILL race — same failure already
  documented in immoapp (`884d1a21`). Appenders must re-read the committed
  file immediately before writing and never use overwrite-writes on a shared
  store.

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
  note the 3-day expiry of the first link). If `/api/mcp/share` does not
  return the project id yet, coordinate app-side; acceptance = both URLs in
  the final tool text + unit test asserting both lines.
- **Opportunity (not implemented):** the Makler acceptance gate (review
  through the eyes of a paying DACH agent) was added as a per-issue comment —
  worth promoting into the repo CLAUDE.md / review checklist so every MCP
  text change gets it by default, not just issues where the founder remembers
  to paste it.

## 2026-07-02 — Issue #5: OAuth resource server (RFC 9728) — Claude auto-discovers the app's sign-in, zero key-pasting

**Goal:** Make the ImmoStage MCP connector installable in Claude with zero
manual key-pasting: when a user adds the connector without credentials, the
server (as OAuth resource server per RFC 9728) advertises where the app's
OAuth authorization server lives, so Claude auto-discovers it and opens the
sign-in popup — turning connector installation itself into a self-serve
trial-start funnel instead of a copy-an-API-key chore.

**Matched skills:** `[]` (none — auth/routing infra, repo-grounded research only).

### Fixed cross-repo contract (app side = immostage-3d issue #28, built in parallel — mock in tests, do NOT change paths or token format)

- AS metadata lives at `https://app.immostage.ai/.well-known/oauth-authorization-server` (RFC 8414; endpoints `/mcp/authorize`, `/api/mcp/oauth/token`, `/api/mcp/oauth/register`, PKCE S256).
- OAuth access tokens look like `mcp_oauth_<random>` and are validated by the app exactly like `mcp_live_` keys (sha256 row in the app's `mcp_api_keys`). This repo keeps passing the Bearer through unchanged.

### Playbook structure

1. Serve `GET /.well-known/oauth-protected-resource` (RFC 9728 JSON):
   `resource` = the MCP server URL (`https://mcp-immostage.vercel.app`),
   `authorization_servers: ["https://app.immostage.ai"]`. Vercel routing
   (`vercel.json` rewrite/headers or a small `api/` function) must actually
   serve the path in prod — the repo is static-`public/` + `api/` functions,
   there is no framework router.
2. Unauthenticated MCP requests return 401 with
   `WWW-Authenticate: Bearer resource_metadata="https://mcp-immostage.vercel.app/.well-known/oauth-protected-resource"`
   — this header is what triggers Claude's OAuth discovery. The exact
   insertion point is the existing 401 branch in `api/mcp.ts` (~line 32).
3. No auth-logic change: `validateApiKey` stays presence-check-only; both
   `mcp_live_` and `mcp_oauth_` Bearers pass through to the app unchanged.
4. Unit tests: metadata endpoint returns valid RFC 9728 JSON; 401 carries the
   WWW-Authenticate header. `npx tsc --noEmit` exit 0.
5. Guardrails: German user-facing strings; do not register the deferred
   Phase-F tools; Makler acceptance gate pinned on the issue (judge as a
   German Immobilienmakler, Sie-Form, no anglicisms; borderline = not
   approved, max 3 iterations).

### Success criteria

- `GET /.well-known/oauth-protected-resource` served in prod (Vercel routing verified, not just local) with `resource` + `authorization_servers` per RFC 9728.
- Unauthenticated MCP request → 401 + `WWW-Authenticate: Bearer resource_metadata="..."` header.
- Bearer pass-through unchanged for both token prefixes; no server-side validation added.
- Unit tests green (metadata JSON shape + 401 header); `npx tsc --noEmit` exit 0.

### Validated repo facts (reusable for future auth/routing issues in this repo)

- **Auth is prefix-blind by design:** `src/middleware/auth.ts`
  `validateApiKey()` only checks for a non-empty `Bearer` value; the app
  (`/api/mcp/*`) is the real authority (tenant resolution + billing). That is
  why `mcp_oauth_` tokens need ZERO changes in this repo — the whole
  "resource server" reduces to one metadata document + one response header.
- **The 401 to decorate is in `api/mcp.ts`** (single handler, ~line 32:
  `res.status(401).json({ error: auth.error })`). Note the handler also
  returns 405 for non-POST and 204 for OPTIONS before auth runs — only the
  401 path needs (and per RFC 9728 gets) the `WWW-Authenticate` header.
- **Routing surface is `vercel.json`, not a framework:** `outputDirectory:
  "public"` (static), one rewrite (`/` → `/index.html`), per-path `headers`
  blocks, and `api/*.ts` functions. A new well-known path must be wired here
  explicitly; an extensionless static file under `public/.well-known/` risks
  a wrong Content-Type — an `api/` function or rewrite + headers entry is the
  controllable option. (No Next middleware here, so immoapp's trailing-slash
  308 trap on `/.well-known/*` does NOT apply in this repo — but it DOES
  apply on the app side of the handshake; see immoapp findings issue #28.)
- **CORS is declared twice** (defense in depth): `vercel.json` headers block
  for `/api/mcp` AND `setHeader` calls inside `api/mcp.ts`. Any new
  cross-origin-relevant header (e.g. exposing `WWW-Authenticate`) must be
  added in both places or they drift.
- **Companion findings live in immoapp** `docs/research/findings-backend-infra.md`
  (issue #28 section): AS-side contract, `mcp_api_keys` hash-lookup resolver,
  and the well-known 308 deployment trap.

### Critic opportunities / surprises (including NOT implemented this round — pick these up later)

- **Surprise (scope insight):** because auth here is a presence check and the
  app's key resolver is hash-lookup/prefix-blind, "become an OAuth resource
  server" is a ~zero-token-code change: one JSON document + one header. Future
  credential-type additions should expect the same shape — if a change in this
  repo wants token logic, that is a design smell (authority belongs app-side).
- **Surprise (verification trap):** everything about this issue passes locally
  while being broken in prod if `vercel.json` routing doesn't actually serve
  the well-known path — same "only the live connector handshake fails" class
  as the app-side 308 trap. Acceptance must include a prod (or preview) curl
  of the metadata URL and of the 401 header, not just unit tests.
- **Opportunity (not implemented):** browser-based MCP clients can only read
  `WWW-Authenticate` cross-origin if it's in `Access-Control-Expose-Headers`
  (currently only `Mcp-Session-Id` is exposed, in both CORS declarations).
  Add when a browser client matters.
- **Opportunity (not implemented):** the `resource` URL is hardcoded to
  `mcp-immostage.vercel.app`. A move to a custom domain (e.g.
  mcp.immostage.ai) silently breaks the RFC 9728 `resource` ↔ actual-URL
  match — derive from the request Host or an env var when the domain changes.
- **Opportunity (not implemented):** no `scopes_supported` in the metadata —
  mirrors the app side's no-scopes v1 (an OAuth token grants full tenant
  access). Add together with app-side scopes.
- **Opportunity (not implemented, cross-cutting):** this is the third
  cross-repo fixed contract (#25/#27 `skipped[]`, #28/#5 OAuth) with no
  mechanical drift check — a shared contract fixture or staging smoke test
  covering discovery (metadata fetch → 401 header → AS metadata fetch) would
  catch either side changing shape.
- **Opportunity (not implemented):** conversion instrumentation — the point is
  install→trial-start; without an analytics event distinguishing OAuth-token
  usage from pasted-key usage (app side owns the data: `label` column on
  `mcp_api_keys`), funnel impact is unmeasurable.

*Provenance note: playbook/critic content reconstructed at store-time from the
issue #5 body (contract + acceptance criteria + guardrails), the pinned Makler
acceptance-gate comment, direct repo inspection (`api/mcp.ts`,
`src/middleware/auth.ts`, `vercel.json`), and the companion immoapp issue #28
findings; recorded before the build landed (branch
`feat/issue-5-oauth-discovery` existed with no commits ahead of master at
store time), so "not implemented" flags reflect playbook scope, not a shipped
diff.*
