"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  Divider,
  Chip,
  Tooltip,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import LockResetIcon from "@mui/icons-material/LockReset";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SendIcon from "@mui/icons-material/Send";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import FlashOnIcon from "@mui/icons-material/FlashOn";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"login" | "forgot">("login");

  // Sign In state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [directLoadingRole, setDirectLoadingRole] = useState<string | null>(null);
  const [loginSuccessNotice, setLoginSuccessNotice] = useState<string | null>(null);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  // Check URL query parameters
  useEffect(() => {
    if (searchParams.get("forgot") === "1") {
      setMode("forgot");
    }
    if (searchParams.get("reset") === "1") {
      setLoginSuccessNotice(
        "Your password has been successfully updated. Please sign in with your new password."
      );
    }
  }, [searchParams]);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccessNotice(null);
    setLoginLoading(true);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setLoginError("Please enter both email/username and password.");
      setLoginLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: cleanEmail,
        password: cleanPassword,
        redirect: false,
      });

      setLoginLoading(false);

      if (result?.error) {
        setLoginError("Login failed. Please check credentials or use 1-click login below.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoginLoading(false);
      setLoginError("Connection issue during sign-in. Please try again or use 1-click demo login below.");
    }
  }

  async function handleDirectLogin(demoEmail: string, roleLabel: string, demoPassword = "Admin@123") {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoginError(null);
    setDirectLoadingRole(roleLabel);
    setLoginLoading(true);

    try {
      const result = await signIn("credentials", {
        email: demoEmail.trim(),
        password: demoPassword.trim(),
        redirect: false,
      });

      if (result?.error) {
        setLoginError(`Login failed for ${demoEmail}. Try again or reset password.`);
        setLoginLoading(false);
        setDirectLoadingRole(null);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoginError("Connection issue during sign-in. Please try again.");
      setLoginLoading(false);
      setDirectLoadingRole(null);
    }
  }

  function handleQuickFill(demoEmail: string, demoRole: string) {
    setEmail(demoEmail);
    setPassword("Admin@123");
    setLoginError(null);
    setLoginSuccessNotice(`Selected ${demoRole} account credentials. Click Sign In to proceed.`);
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setDevResetUrl(null);
    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || "Failed to process request. Please try again.");
        return;
      }

      setForgotSuccess(
        data.message ||
          "If an account with that email exists, a password reset link has been sent."
      );

      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch {
      setForgotError("Network error. Please check your connection and try again.");
    } finally {
      setForgotLoading(false);
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
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 420,
          width: "100%",
          borderRadius: 2,
          transition: "all 0.2s ease-in-out",
        }}
      >
        {mode === "login" ? (
          <>
            <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <SupportAgentIcon color="primary" sx={{ fontSize: 42 }} />
              <Typography variant="h5" fontWeight={700}>
                IT Help Desk
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to manage support tickets
              </Typography>
            </Stack>

            {loginSuccessNotice && (
              <Alert
                severity="success"
                sx={{ mb: 2 }}
                onClose={() => setLoginSuccessNotice(null)}
              >
                {loginSuccessNotice}
              </Alert>
            )}

            {loginError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {loginError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleLoginSubmit}>
              <Stack spacing={2}>
                <TextField
                  id="login-email"
                  name="email"
                  label="Email or Username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com or lakshand969"
                  required
                  fullWidth
                  autoComplete="username"
                  inputProps={{ autoCapitalize: "none", inputMode: "email" }}
                  helperText="Enter email or username (e.g., admin, lakshand969, agent, employee)"
                />
                <TextField
                  id="login-password"
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotError(null);
                      setForgotSuccess(null);
                      setDevResetUrl(null);
                      setMode("forgot");
                    }}
                    sx={{
                      textTransform: "none",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      p: 0,
                    }}
                  >
                    Forgot password?
                  </Button>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loginLoading}
                  fullWidth
                  sx={{ py: 1.2, fontWeight: 600 }}
                >
                  {loginLoading && !directLoadingRole ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={18} color="inherit" />
                      <span>Signing in...</span>
                    </Stack>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <Divider sx={{ my: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Instant 1-Click Demo Login
                  </Typography>
                </Divider>

                <Box
                  sx={{
                    bgcolor: "grey.50",
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "grey.200",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                    Click below to sign in instantly with full permissions (Default: <strong>Admin@123</strong>):
                  </Typography>

                  <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<FlashOnIcon fontSize="small" />}
                      disabled={loginLoading}
                      onClick={() => handleDirectLogin("admin@company.com", "Admin")}
                      sx={{ textTransform: "none", justifyContent: "flex-start", fontWeight: 600 }}
                    >
                      {directLoadingRole === "Admin" ? "Signing in as Admin..." : "Sign in as Admin (admin@company.com)"}
                    </Button>

                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      startIcon={<FlashOnIcon fontSize="small" />}
                      disabled={loginLoading}
                      onClick={() => handleDirectLogin("lakshand969@gmail.com", "Lakshan")}
                      sx={{ textTransform: "none", justifyContent: "flex-start", fontWeight: 600 }}
                    >
                      {directLoadingRole === "Lakshan" ? "Signing in as Lakshan..." : "Sign in as Lakshan (lakshand969@gmail.com)"}
                    </Button>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        color="info"
                        size="small"
                        fullWidth
                        disabled={loginLoading}
                        onClick={() => handleDirectLogin("agent@company.com", "Agent")}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        {directLoadingRole === "Agent" ? "Signing in..." : "Agent"}
                      </Button>

                      <Button
                        variant="outlined"
                        color="inherit"
                        size="small"
                        fullWidth
                        disabled={loginLoading}
                        onClick={() => handleDirectLogin("employee@company.com", "Employee")}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        {directLoadingRole === "Employee" ? "Signing in..." : "Employee"}
                      </Button>
                    </Stack>
                  </Stack>

                  <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px dashed", borderColor: "grey.300" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                      Quick Fill Inputs Only:
                    </Typography>
                    <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                      <Chip
                        label="Admin"
                        size="small"
                        variant={email.includes("admin") ? "filled" : "outlined"}
                        onClick={() => handleQuickFill("admin@company.com", "Admin")}
                        sx={{ cursor: "pointer", fontSize: "0.75rem" }}
                      />
                      <Chip
                        label="lakshand969"
                        size="small"
                        color="secondary"
                        variant={email.includes("lakshan") ? "filled" : "outlined"}
                        onClick={() => handleQuickFill("lakshand969@gmail.com", "Lakshan")}
                        sx={{ cursor: "pointer", fontSize: "0.75rem" }}
                      />
                      <Chip
                        label="Agent"
                        size="small"
                        variant={email.includes("agent") ? "filled" : "outlined"}
                        onClick={() => handleQuickFill("agent@company.com", "Agent")}
                        sx={{ cursor: "pointer", fontSize: "0.75rem" }}
                      />
                      <Chip
                        label="Employee"
                        size="small"
                        variant={email.includes("employee") ? "filled" : "outlined"}
                        onClick={() => handleQuickFill("employee@company.com", "Employee")}
                        sx={{ cursor: "pointer", fontSize: "0.75rem" }}
                      />
                    </Stack>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </>
        ) : (
          <>
            <Stack spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  bgcolor: "primary.light",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LockResetIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                Reset Password
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                sx={{ px: 1 }}
              >
                Enter your work email address to receive a secure link to reset your password.
              </Typography>
            </Stack>

            {forgotError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {forgotError}
              </Alert>
            )}

            {forgotSuccess ? (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Alert
                  severity="success"
                  icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                >
                  {forgotSuccess}
                </Alert>

                {devResetUrl && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "primary.50",
                      border: "1px dashed",
                      borderColor: "primary.main",
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} color="primary.dark" display="block">
                      Simulated Environment Link:
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                      SMTP is running in simulation mode. You can open the generated password reset link directly:
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      endIcon={<OpenInNewIcon fontSize="small" />}
                      onClick={() => router.push(devResetUrl)}
                      fullWidth
                    >
                      Open Password Reset Form
                    </Button>
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary" textAlign="center">
                  The link will expire in 60 minutes. Check your inbox and spam folder.
                </Typography>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    setForgotSuccess(null);
                    setDevResetUrl(null);
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Send another link
                </Button>

                <Divider sx={{ my: 0.5 }} />

                <Button
                  variant="text"
                  color="inherit"
                  fullWidth
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setMode("login");
                    setForgotSuccess(null);
                    setDevResetUrl(null);
                  }}
                >
                  Back to Sign In
                </Button>
              </Stack>
            ) : (
              <Box component="form" onSubmit={handleForgotSubmit}>
                <Stack spacing={2}>
                  <TextField
                    id="forgot-email"
                    name="email"
                    label="Work Email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    fullWidth
                    autoFocus
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={forgotLoading || !forgotEmail}
                    fullWidth
                    startIcon={
                      forgotLoading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <SendIcon fontSize="small" />
                      )
                    }
                    sx={{ py: 1.2, fontWeight: 600 }}
                  >
                    {forgotLoading ? "Sending Link..." : "Send Reset Link"}
                  </Button>

                  <Button
                    variant="text"
                    color="inherit"
                    fullWidth
                    startIcon={<ArrowBackIcon />}
                    onClick={() => setMode("login")}
                    disabled={forgotLoading}
                  >
                    Back to Sign In
                  </Button>
                </Stack>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}

export default function LoginPage() {
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
      <LoginContent />
    </Suspense>
  );
}
