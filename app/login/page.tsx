// app/login/page.tsx
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
import { useSnackbar } from "notistack";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [timeoutNotice, setTimeoutNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();

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
      enqueueSnackbar("Login failed. Please check your credentials.", { variant: "error" });
      return;
    }

    // Trigger the notistack success popup
    enqueueSnackbar("Logged in successfully!", { variant: "success" });

    // Check if user is logging in with a temporary password
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (sessionData?.user?.mustChangePassword) {
        enqueueSnackbar("First-time login: Please set your new permanent password.", { variant: "info" });
        router.push("/first-login");
        router.refresh();
        return;
      }
    } catch {
      // Fallback if session fetch fails, middleware will enforce /first-login
    }

    let target = "/dashboard";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get("callbackUrl");
      if (callback && callback.startsWith("/") && !callback.startsWith("//") && callback !== "/first-login") {
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
      </Paper>
    </Box>
  );
}