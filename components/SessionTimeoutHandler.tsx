"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  LinearProgress,
  Stack,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import RefreshIcon from "@mui/icons-material/Refresh";

// 15 minutes total inactivity allowed
const TIMEOUT_MS = 15 * 60 * 1000; // 900,000 ms
// Warning displayed for the last 60 seconds of inactivity
const WARNING_MS = 60 * 1000; // 60,000 ms

export default function SessionTimeoutHandler() {
  const { status, update } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const lastActivityRef = useRef<number>(Date.now());
  const isWarningOpenRef = useRef<boolean>(false);

  // Keep ref in sync to avoid stale closures in event listeners
  useEffect(() => {
    isWarningOpenRef.current = showWarning;
  }, [showWarning]);

  const handleSignOut = useCallback(() => {
    setShowWarning(false);
    signOut({ callbackUrl: "/login?reason=timeout" });
  }, []);

  const handleStayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    if (typeof update === "function") {
      update();
    }
  }, [update]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    lastActivityRef.current = Date.now();

    // Reset lastActivity on user interaction only when warning modal is NOT open
    const handleUserActivity = () => {
      if (!isWarningOpenRef.current) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Check inactivity on interval
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remaining = TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        handleSignOut();
      } else if (remaining <= WARNING_MS) {
        setSecondsRemaining(Math.ceil(remaining / 1000));
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    // Handle tab visibility change (e.g. user leaves tab for >5 mins and returns)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= TIMEOUT_MS) {
          handleSignOut();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, handleSignOut]);

  if (status !== "authenticated") {
    return null;
  }

  const progressPercent = Math.max(
    0,
    Math.min(100, (secondsRemaining / 60) * 100)
  );

  return (
    <Dialog
      open={showWarning}
      onClose={(_e, reason) => {
        // Prevent closing by clicking backdrop to ensure explicit decision
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        handleStayLoggedIn();
      }}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          border: "1px solid",
          borderColor: "warning.main",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              bgcolor: "warning.light",
              color: "warning.dark",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AccessTimeIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Session Expiring Soon
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Inactivity detected
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          You have been inactive for over 14 minutes. For security reasons, you
          will be automatically signed out in:
        </Typography>

        <Box sx={{ textAlign: "center", my: 2 }}>
          <Typography
            variant="h3"
            fontWeight={700}
            color={secondsRemaining <= 15 ? "error.main" : "warning.main"}
          >
            {secondsRemaining}s
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Remaining before automatic sign out
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progressPercent}
          color={secondsRemaining <= 15 ? "error" : "warning"}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={handleSignOut}
          variant="outlined"
          color="inherit"
          startIcon={<ExitToAppIcon />}
          fullWidth
          sx={{ borderColor: "rgba(0,0,0,0.2)" }}
        >
          Sign Out Now
        </Button>
        <Button
          onClick={handleStayLoggedIn}
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          fullWidth
          autoFocus
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
}
