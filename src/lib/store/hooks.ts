"use client";
import { useMemo } from "react";
import { can as canDo, type Action } from "./engine";
import { openCycle } from "./actions";
import { me as meOf, viewedCycle, isArchivedView } from "./selectors";
import { useApp } from "./store";

/** Current session: state, signed-in user, the cycle being viewed, and permission helper. */
export function useSession() {
  const s = useApp();
  const me = meOf(s);
  return useMemo(
    () => ({
      s,
      me,
      open: openCycle(s),
      cycle: viewedCycle(s),
      readOnly: isArchivedView(s),
      // Q13: when "anyone creates a mission" is on, collaborateurs may too (HR never does).
      can: (a: Action) => canDo(me, a) || (a === "mission.create" && s.settings.visibility.anyoneCreatesMission && me?.role === "COLLABORATEUR"),
    }),
    [s, me],
  );
}
