"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
  Chip,
  CircularProgress,
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { useSnackbar } from "notistack";

export default function FirstLoginPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { enqueueSnackbar } = useSnackbar();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && !session?.user?.mustChangePassword) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading" || !session?.user) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasLetter && hasNumberOrSymbol && passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (!passwordsMatch) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/first-login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update password. Please try again.");
        enqueueSnackbar(data.error || "Failed to update password.", { variant: "error" });
        return;
      }

      // Update session token client-side
      await update({ mustChangePassword: false });
      enqueueSnackbar("Password set successfully! Welcome to Transco HelpDesk.", { variant: "success" });

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      enqueueSnackbar("An unexpected error occurred.", { variant: "error" });
    } finally {
      setLoading(false);
    }
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
        py: 4,
      }}
    >
      <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 }, maxWidth: 480, width: "100%", borderRadius: 2 }}>
        <Stack spacing={1.5} alignItems="center" sx={{ mb: 3, textAlign: "center" }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "primary.light",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1,
            }}
          >
            <LockResetIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Create Your New Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You logged in successfully with your temporary credentials. Please set your new private password to continue.
          </Typography>
        </Stack>

        <Paper variant="outlined" sx={{ p: 1.5, mb: 3, bgcolor: "grey.50", borderRadius: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Signed in as
              </Typography>
              <Typography variant="subtitle2" fontWeight={600}>
                {session.user.name} ({session.user.email})
              </Typography>
            </Box>
            <Chip
              label={session.user.role.toUpperCase()}
              size="small"
              color={session.user.role === "admin" ? "secondary" : session.user.role === "agent" ? "info" : "default"}
              sx={{ fontWeight: 600, fontSize: "0.7rem" }}
            />
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.2}>
            <TextField
              id="new-permanent-password"
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              fullWidth
              size="small"
              placeholder="Enter your new permanent password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              id="confirm-new-password"
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              size="small"
              placeholder="Re-enter your new permanent password"
              error={confirmPassword.length > 0 && !passwordsMatch}
              helperText={confirmPassword.length > 0 && !passwordsMatch ? "Passwords do not match" : ""}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Password requirements visual guide */}
            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                Password Security Checklist:
              </Typography>
              <Stack spacing={0.6}>
                <Stack direction="row" spacing={0.8} alignItems="center">
                  {hasMinLength ? (
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />
                  ) : (
                    <CancelOutlinedIcon color="disabled" sx={{ fontSize: 16 }} />
                  )}
                  <Typography variant="caption" color={hasMinLength ? "success.main" : "text.secondary"}>
                    At least 8 characters
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.8} alignItems="center">
                  {hasLetter ? (
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />
                  ) : (
                    <CancelOutlinedIcon color="disabled" sx={{ fontSize: 16 }} />
                  )}
                  <Typography variant="caption" color={hasLetter ? "success.main" : "text.secondary"}>
                    Contains letters (a-z, A-Z)
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.8} alignItems="center">
                  {hasNumberOrSymbol ? (
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />
                  ) : (
                    <CancelOutlinedIcon color="disabled" sx={{ fontSize: 16 }} />
                  )}
                  <Typography variant="caption" color={hasNumberOrSymbol ? "success.main" : "text.secondary"}>
                    Contains at least one number or symbol
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.8} alignItems="center">
                  {passwordsMatch ? (
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />
                  ) : (
                    <CancelOutlinedIcon color="disabled" sx={{ fontSize: 16 }} />
                  )}
                  <Typography variant="caption" color={passwordsMatch ? "success.main" : "text.secondary"}>
                    Passwords match
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !isPasswordValid}
              sx={{ mt: 1, py: 1.2, fontWeight: 600, textTransform: "none" }}
              fullWidth
            >
              {loading ? "Saving New Password..." : "Set Password & Access System"}
            </Button>

            <Button
              variant="text"
              color="inherit"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={async () => {
                try {
                  await signOut({ redirect: false });
                } catch {
                  // ignore
                }
                window.location.href = "/login";
              }}
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              Sign out and change later
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
