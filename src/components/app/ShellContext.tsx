"use client";
import { createContext, useContext } from "react";

export interface ShellApi {
  openRequest: (opts?: { missionId?: string; recipientIds?: string[] }) => void;
  openMission: () => void;
  openHelp: () => void;
  openProfile: () => void;
  openPalette: () => void;
  startTour: () => void;
  openClientPreview: (token?: string) => void;
}
const noop = () => {};
export const ShellContext = createContext<ShellApi>({ openRequest: noop, openMission: noop, openHelp: noop, openProfile: noop, openPalette: noop, startTour: noop, openClientPreview: noop });
export const useShell = () => useContext(ShellContext);
