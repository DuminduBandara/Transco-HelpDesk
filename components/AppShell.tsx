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
  IconButton,
  Tooltip,
  Badge,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AddIcon from "@mui/icons-material/Add";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import WifiIcon from "@mui/icons-material/Wifi";
import NotificationCenterModal from "@/components/NotificationCenterModal";
import { useRealtime } from "@/hooks/useRealtime";

const ROLE_LABEL: Record<string, string> = {
  employee: "Employee",
  agent: "Agent",
  admin: "Admin",
};

export default function AppShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const fetchNotifCount = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifCount((data.notifications ?? []).length);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchNotifCount();
  }, []);

  const { isConnected } = useRealtime(["notification:created"], () => {
    fetchNotifCount();
  });

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
            sx={{ mr: 1, borderColor: "rgba(255,255,255,0.5)" }}
          >
            New Ticket
          </Button>

          <Tooltip title={isConnected ? "Real-time sync connected" : "Connecting to real-time sync..."}>
            <Chip
              icon={<WifiIcon sx={{ fontSize: "14px !important", color: "inherit !important" }} />}
              label="Live"
              size="small"
              sx={{
                mr: 1.5,
                bgcolor: isConnected ? "rgba(76, 175, 80, 0.25)" : "rgba(255, 255, 255, 0.15)",
                color: "white",
                border: "1px solid",
                borderColor: isConnected ? "rgba(76, 175, 80, 0.5)" : "transparent",
                fontWeight: 600,
                fontSize: "0.72rem",
                height: 24,
              }}
            />
          </Tooltip>

          <Tooltip title="Email Notifications & Outbox">
            <IconButton
              color="inherit"
              onClick={() => setNotificationsOpen(true)}
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={unreadNotifCount} color="error" max={99}>
                <MailOutlineIcon />
              </Badge>
            </IconButton>
          </Tooltip>

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

      <NotificationCenterModal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        isAdmin={role === "admin"}
      />
    </Box>
  );
}
