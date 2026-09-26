"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [timeoutNotice, setTimeoutNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reason") === "timeout") {
        setTimeoutNotice(true);
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please check your credentials.");
      return;
    }

    let target = "/dashboard";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get("callbackUrl");
      if (callback && callback.startsWith("/") && !callback.startsWith("//")) {
        target = callback;
      }
    }

    router.push(target);
    router.refresh();
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: "100%" }}>
        <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <SupportAgentIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h5" fontWeight={600}>
            IT Help Desk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to manage support tickets
          </Typography>
        </Stack>

        {timeoutNotice && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You were signed out due to 5 minutes of inactivity. Please sign in again.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              id="login-email"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              inputRef={emailInputRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              id="login-password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              fullWidth
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed", borderColor: "divider" }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            display="block"
            sx={{ mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            Demo Accounts (Password: Admin@123)
          </Typography>
          <Stack spacing={0.75}>
            <Button
              variant="outlined"
              size="small"
              color="primary"
              onClick={() => {
                setEmail("admin@company.com");
                setPassword("Admin@123");
                setError(null);
              }}
              sx={{
                justifyContent: "space-between",
                textTransform: "none",
                fontSize: "0.75rem",
                py: 0.5,
              }}
            >
              <span>👑 Admin: <b>admin@company.com</b></span>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Click to Fill</Typography>
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="info"
              onClick={() => {
                setEmail("agent@company.com");
                setPassword("Admin@123");
                setError(null);
              }}
              sx={{
                justifyContent: "space-between",
                textTransform: "none",
                fontSize: "0.75rem",
                py: 0.5,
              }}
            >
              <span>🎧 Agent: <b>agent@company.com</b></span>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Click to Fill</Typography>
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              onClick={() => {
                setEmail("employee@company.com");
                setPassword("Admin@123");
                setError(null);
              }}
              sx={{
                justifyContent: "space-between",
                textTransform: "none",
                fontSize: "0.75rem",
                py: 0.5,
              }}
            >
              <span>👤 Employee: <b>employee@company.com</b></span>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Click to Fill</Typography>
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
