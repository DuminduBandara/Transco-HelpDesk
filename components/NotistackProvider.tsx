// components/NotistackProvider.tsx
"use client";

import { SnackbarProvider } from "notistack";
import { ReactNode } from "react";

export default function NotistackProvider({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider 
      maxSnack={3} 
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      autoHideDuration={4500}
    >
      {children}
    </SnackbarProvider>
  );
}