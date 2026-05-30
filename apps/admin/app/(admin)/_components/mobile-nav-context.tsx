"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Bridges the mobile hamburger button (in `MobileHeader`) with the
 * sidebar's drawer-mode rendering (in `Sidebar`). Both components are
 * client components but live as siblings in the server-rendered
 * layout, so a Context wrapper is the cleanest way to share open/close
 * state without prop-drilling through the server boundary.
 */
const MobileNavContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
