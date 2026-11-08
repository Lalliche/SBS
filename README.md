# SBS 360° — Talent & Performance (prototype)

Client pitch prototype for **Sovereign Business & Strategy**, built by SOLRUS. Next.js 16 · Tailwind v4 · Motion · no backend (all data in `localStorage`).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
npm test         # engine + anonymity tests
```

- `/` landing + profile entry · `/app/*` back-office · `/c/<token>` public client page
- Demo controls live in the black bar at the top of the app (persona, scenario, time travel, simulate feedback, client preview, reset). `Ctrl+Shift+D` collapses it.
- Specs and brand notes: `docs/` (`SBS360_PROTOTYPE_SPEC_v2.md`, `CDC_SBS360_officiel.md`, `design-system.md`, `motion-plan.md`, `reference-analysis.md`, and a copy of the shared `prototype-kit/`).
- Project rules for Claude Code: `CLAUDE.md`.

Deploy: any Next.js host (e.g. Vercel). No environment variables are needed.
