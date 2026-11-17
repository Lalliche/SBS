# SBS 360° — What will be edited after the contract (17 Nov 2026, v3)

Internal plan (not for the client). Inputs: the 5 PwC "Feedback Exchange" scans sent by SBS as "modifications to add", the technical meeting, SBS's WhatsApp answers of 17 Nov, and the decisions taken with the team on 17 Nov.

## Decisions
- **No minimum-hours limit.** SBS: it depends on service lines and the limiting is done on their side. No threshold, no hours per assignment from the API.
- **No restriction on directions.** Nothing in the scans restricts who can ask or give to whom; anyone can ask or give to anyone (meeting). The system only proposes the direction.
- **French only for now.** English is added later (architecture stays ready). No language switch built.
- Daily status: not in this platform. Assurance questions and "expectations in the role": dropped.
- Not copied from PwC: one evaluator per request (ours allows several), mission mandatory for downward (contradicts the meeting), adding a project by hand (missions come from SBS's system).

## Prototype edits
1. **Accueil:** counters by direction (Ascendant / Pair / Descendant) for requests sent and feedback received.
2. **Direction by grade** (`engine.ts`): when there is no reporting link, compare grades (today no relation is found, which blocks "ask anyone"). The request and the wizard show the proposed direction and let the user correct it: peer / more junior / keep.
3. **Request drawer:** ask anyone, mission optional, mission search by OTP / client, required "Votre rôle sur la mission" when a mission is chosen, optional "Heures passées sur la mission", recap before sending.
4. **Mes demandes:** "Retourner la demande" next to "Décliner" (reason to the requester, who corrects and resends); direction chip in the list.
5. **Answer wizard:** "Comment avez-vous travaillé ensemble ?" free-text step for downward and peer feedback only; the six pillars stay the core; free comments at the end.
6. **Hierarchy when SBS's system has none** (`collaborateurs`): the import file gets a "responsable" column (matricule of the manager), a bulk "assign responsable" action, and the existing "sans responsable" filter becomes the to-do list. Done by Admin RH.
7. **Data model:** `FeedbackRequest.missionId` nullable, request status "Retournée", `STATE_VERSION` 4 → 5, new tests (direction by grade, request without mission, return flow, hierarchy import); anonymity tests untouched.

## Still from the technical meeting
- Optional "Synchronisation" screen with fictional data (tech admin).

## Documents
- Scope doc: hierarchy row in section 04 and in module 10 (done). Still to add: direction proposal and the new request fields in module 4.
- CDC, spec section 1.1, `CLAUDE.md` status: add these changes.

## Waiting on SBS
- **The 6 pillars and the questions**: SBS sends them once the contract is signed (Nabila, 17 Nov). Until then the competencies and the question bank in `seed.ts` / the scope doc are placeholders. When received: replace the competencies (6), the question bank (variants per relation and grade band) and the `q-0` wording if they differ; check that the radar, synthesis editor and tests still hold with exactly 6 pillars.

## Open
- Who may edit the hierarchy: read as Admin RH (the last message was unclear: "can" or "cannot").
- Nabila: "il fait une synthèse": read as the responsable writing the synthesis (already the case).
