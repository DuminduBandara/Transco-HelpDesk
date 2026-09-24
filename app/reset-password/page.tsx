"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LockResetIcon from "@mui/icons-material/LockReset";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setVerificationError("No reset token was provided in the link.");
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setTokenValid(true);
          setUserEmail(data.email || "");
        } else {
          setVerificationError(
            data.error || "This password reset link is invalid or has expired."
          );
        }
      } catch {
        setVerificationError("Network error verifying password reset link.");
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please re-type them.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to reset password. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setSubmitError("Network error resetting password. Please check your connection.");
    } finally {
      setSubmitting(false);
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
      <Paper elevation={3} sx={{ p: 4, maxWidth: 440, width: "100%", borderRadius: 2 }}>
        <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
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
            <LockResetIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            IT Help Desk Ticketing System
          </Typography>
        </Stack>

        {verifying && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
            <CircularProgress size={36} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Verifying your reset link...
            </Typography>
          </Box>
        )}

        {!verifying && verificationError && (
          <Stack spacing={2.5}>
            <Alert severity="error">{verificationError}</Alert>
            <Typography variant="body2" color="text.secondary">
              Password reset links expire after 60 minutes or after being used once. You can request a fresh link at any time.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => router.push("/login?forgot=1")}
              startIcon={<ArrowBackIcon />}
            >
              Request New Reset Link
            </Button>
            <Button
              variant="text"
              color="inherit"
              fullWidth
              onClick={() => router.push("/login")}
            >
              Return to Sign In
            </Button>
          </Stack>
        )}

        {!verifying && tokenValid && success && (
          <Stack spacing={2.5} alignItems="center" sx={{ py: 1 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                bgcolor: "success.light",
                color: "success.dark",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 38 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} textAlign="center">
              Password Changed Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Your IT Help Desk password has been updated. You can now use your new password to sign in.
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => router.push("/login")}
              sx={{ mt: 1 }}
            >
              Sign In Now
            </Button>
          </Stack>
        )}

        {!verifying && tokenValid && !success && (
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {userEmail && (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block">
                    Resetting password for:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">
                    {userEmail}
                  </Typography>
                </Box>
              )}

              {submitError && <Alert severity="error">{submitError}</Alert>}

              <TextField
                id="new-password"
                name="new-password"
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                helperText="Must be at least 8 characters long"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                id="confirm-password"
                name="confirm-password"
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                fullWidth
                error={Boolean(confirmPassword && password !== confirmPassword)}
                helperText={
                  confirmPassword && password !== confirmPassword
                    ? "Passwords do not match"
                    : ""
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={submitting || !password || !confirmPassword}
              >
                {submitting ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={20} color="inherit" />
                    <span>Updating Password...</span>
                  </Stack>
                ) : (
                  "Set New Password"
                )}
              </Button>

              <Button
                variant="text"
                color="inherit"
                fullWidth
                onClick={() => router.push("/login")}
                startIcon={<ArrowBackIcon />}
                disabled={submitting}
              >
                Back to Sign In
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
