"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Container,
  Chip,
  CircularProgress,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AddIcon from "@mui/icons-material/Add";
import NotificationBell from "@/components/NotificationBell";

const ROLE_LABEL: Record<string, string> = {
  employee: "Employee",
  agent: "Agent",
  admin: "Admin",
};

export default function AppShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || status === "loading") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const role = session?.user?.role;

  const navLink = (href: string, label: string) => (
    <Button
      component={Link}
      href={href}
      color="inherit"
      sx={{
        opacity: pathname === href ? 1 : 0.75,
        fontWeight: pathname === href ? 700 : 400,
      }}
    >
      {label}
    </Button>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <SupportAgentIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 0, mr: 3 }}>
            IT Help Desk
          </Typography>

          <Box sx={{ display: "flex", gap: 0.5, flexGrow: 1 }}>
            {navLink("/dashboard", "Dashboard")}
            {navLink("/tickets", "Tickets")}
            {role === "admin" && navLink("/admin/users", "Users")}
          </Box>

          <Button
            component={Link}
            href="/tickets/new"
            color="inherit"
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ mr: 2, borderColor: "rgba(255,255,255,0.5)" }}
          >
            New Ticket
          </Button>

          <NotificationBell />

          {role && (
            <Chip
              label={ROLE_LABEL[role]}
              size="small"
              sx={{ mr: 2, bgcolor: "rgba(255,255,255,0.15)", color: "white" }}
            />
          )}

          <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
            {session?.user?.name}
          </Typography>

          <Button color="inherit" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign Out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
