"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Divider,
  CircularProgress,
  Avatar,
  Chip,
  Grid,
  InputAdornment,
  IconButton,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          setDepartment(data.user.department || "");
          setRole(data.user.role || "");
          setCreatedAt(data.user.created_at || "");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirmation do not match.");
        return;
      }
      if (!currentPassword) {
        setError("Please enter your current password to set a new password.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        department: department.trim(),
      };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update profile.");
        return;
      }

      setSuccess("Your profile has been successfully updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Update next-auth session display name if available
      if (update) {
        await update({ name: name.trim() });
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const roleColors: Record<string, "primary" | "info" | "default"> = {
    admin: "primary",
    agent: "info",
    employee: "default",
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", pb: 6 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/dashboard")}
        sx={{ mb: 3 }}
      >
        Back to Dashboard
      </Button>

      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Account Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your personal information, department details, and account security
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon fontSize="inherit" />}
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Profile Overview Card */}
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "primary.main",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                }}
              >
                {name.charAt(0).toUpperCase() || "U"}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {email}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={role.toUpperCase()}
                    color={roleColors[role] || "default"}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
                  />
                </Box>
              </Box>
            </Stack>

            <Divider sx={{ mb: 3 }} />

            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
            >
              <PersonOutlineIcon fontSize="small" color="primary" />
              Personal Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Full Name"
                  fullWidth
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Department"
                  fullWidth
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Operations, IT, Finance"
                  size="small"
                  helperText="Your organizational department"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email Address"
                  fullWidth
                  disabled
                  value={email}
                  size="small"
                  helperText="Email is managed by your system administrator"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Role"
                  fullWidth
                  disabled
                  value={role.toUpperCase()}
                  size="small"
                  helperText="Access permissions determined by role"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Security Card */}
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
            >
              <LockOutlinedIcon fontSize="small" color="primary" />
              Change Password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Leave these fields blank if you do not want to change your password.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Current Password"
                  type={showCurrentPassword ? "text" : "password"}
                  fullWidth
                  size="small"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to verify"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle current password visibility"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="New Password"
                  type={showNewPassword ? "text" : "password"}
                  fullWidth
                  size="small"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle new password visibility"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Confirm New Password"
                  type={showConfirmPassword ? "text" : "password"}
                  fullWidth
                  size="small"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Submit Actions */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => router.push("/dashboard")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={saving}
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </Box>
        </Stack>
      </form>
    </Box>
  );
}
