"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DomainIcon from "@mui/icons-material/Domain";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TuneIcon from "@mui/icons-material/Tune";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { User, Role } from "@/types";
import { useSnackbar } from "notistack";

const ROLE_COLORS: Record<Role, any> = {
  employee: "default",
  agent: "info",
  admin: "secondary",
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Delete user state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Departments state
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [deptActionLoading, setDeptActionLoading] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);

  // User form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [department, setDepartment] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (data.departments) {
        setDepartments(data.departments);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, [loadUsers, loadDepartments]);

  function openCreateDialog() {
    setEditingUser(null);
    setName("");
    setEmail("");
    setMobileNumber("");
    setPassword("");
    setRole("employee");
    setDepartment(departments[0] || "");
    setIsActive(true);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setMobileNumber(user.mobile_number || "");
    setPassword("");
    setRole(user.role);
    setDepartment(user.department ?? "");
    // Ensure this is cast strictly to a boolean in case MySQL returned 1 or 0
    setIsActive(user.role === "admin" ? true : Boolean(user.is_active));
    setError(null);
    setDialogOpen(true);
  }

  function openDeleteDialog(user: User) {
    setUserToDelete(user);
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete user.");
        enqueueSnackbar("Failed to delete user account.", { variant: "error" });
        return;
      }

      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      loadUsers();
      enqueueSnackbar("User account deleted successfully.", { variant: "success" });
    } catch {
      setDeleteError("An unexpected error occurred while deleting the user.");
      enqueueSnackbar("An unexpected error occurred.", { variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    let res: Response;
    if (editingUser) {
      const patch: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        role,
        // Strictly cast to boolean to avoid Zod 400 Bad Request errors 
        is_active: role === "admin" ? true : Boolean(isActive),
      };
      
      // Assign null if empty, preventing undefined variable errors
      patch.mobile_number = mobileNumber.trim() || null;
      patch.department = department || null;

      if (password) patch.password = password;

      res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } else {
      res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          mobile_number: mobileNumber.trim() || null,
          password,
          role,
          department: department || null,
        }),
      });
    }

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      let errMsg = data.error ?? "Failed to save user.";
      
      // Extract exact Zod validation details if the server rejected the shape of the data
      if (data.details) {
        const errorDetails = data.details.fieldErrors || data.details;
        if (typeof errorDetails === "object" && !Array.isArray(errorDetails)) {
          const detailStr = Object.entries(errorDetails)
            .map(([field, err]) => `${field}: ${Array.isArray(err) ? err.join(", ") : err}`)
            .join(" | ");
          errMsg = `${errMsg} (${detailStr})`;
        } else {
          errMsg = `${errMsg} (${JSON.stringify(data.details)})`;
        }
      }

      setError(errMsg);
      enqueueSnackbar("Failed to save user details. See error message.", { variant: "error" });
      return;
    }

    setDialogOpen(false);
    loadUsers();
    
    // Trigger the slide-down success popup
    enqueueSnackbar(
      editingUser ? "User profile updated successfully!" : "New user account created successfully!", 
      { variant: "success" }
    );
  }

  async function handleAddDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setDeptActionLoading(true);
    setDeptError(null);

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeptError(data.error || "Failed to add department");
        enqueueSnackbar("Failed to add department.", { variant: "error" });
        return;
      }
      setDepartments(data.departments);
      setNewDeptName("");
      // If creating user, auto-select newly created department
      if (!department) {
        setDepartment(newDeptName.trim());
      }
      enqueueSnackbar(`Department "${newDeptName.trim()}" added successfully!`, { variant: "success" });
    } catch {
      setDeptError("Failed to add department. Please try again.");
      enqueueSnackbar("Failed to add department.", { variant: "error" });
    } finally {
      setDeptActionLoading(false);
    }
  }

  async function handleDeleteDepartment(deptToRemove: string) {
    setDeptActionLoading(true);
    setDeptError(null);

    try {
      const res = await fetch(
        `/api/departments?name=${encodeURIComponent(deptToRemove)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setDeptError(data.error || "Failed to delete department");
        enqueueSnackbar("Failed to delete department.", { variant: "error" });
        return;
      }
      setDepartments(data.departments);
      if (department === deptToRemove) {
        setDepartment("");
      }
      enqueueSnackbar(`Department "${deptToRemove}" removed successfully!`, { variant: "success" });
    } catch {
      setDeptError("Failed to delete department.");
      enqueueSnackbar("Failed to delete department.", { variant: "error" });
    } finally {
      setDeptActionLoading(false);
    }
  }

  const currentAdminEmail = session?.user?.email?.toLowerCase();

  const columns: GridColDef<User>[] = [
    { field: "id", headerName: "ID", width: 70, align: "center", headerAlign: "center" },
    { field: "name", headerName: "Name", flex: 1, minWidth: 150 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 200 },
    {
      field: "mobile_number",
      headerName: "Mobile",
      width: 170,
      renderCell: (params) => {
        const phone = params.row.mobile_number;
        const isAdmin = params.row.role === "admin";
        if (!phone) {
          return <Typography variant="caption" color="text.secondary">—</Typography>;
        }
        return (
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ height: "100%" }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
              {phone}
            </Typography>
            {isAdmin && (
              <Tooltip title="Admin mobile number: Protected and hidden from non-admin users">
                <Chip
                  label="Private"
                  size="small"
                  variant="outlined"
                  color="warning"
                  sx={{ height: 18, fontSize: "0.62rem", px: 0.2, fontWeight: 600 }}
                />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
    {
      field: "role",
      headerName: "Role",
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={ROLE_COLORS[params.value as Role]}
        />
      ),
    },
    {
      field: "department",
      headerName: "Department",
      width: 170,
      valueGetter: (_value, row) => row.department ?? "—",
    },
    {
      field: "is_active",
      headerName: "Active",
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        // Admin profiles cannot be inactive / active toggle removed
        if (params.row.role === "admin") {
          return (
            <Chip
              label="Active"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          );
        }
        return (
          <Chip
            label={params.value ? "Active" : "Disabled"}
            size="small"
            color={params.value ? "success" : "default"}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 170,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const isSelf = currentAdminEmail && params.row.email.toLowerCase() === currentAdminEmail;

        return (
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => openEditDialog(params.row)}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.78rem",
                py: 0.3,
                px: 1,
                borderRadius: 1.5,
              }}
            >
              Edit
            </Button>

            {isSelf ? (
              <Tooltip title="You cannot delete your own admin account">
                <span>
                  <IconButton size="small" disabled sx={{ opacity: 0.35 }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            ) : (
              <Tooltip title={`Delete user ${params.row.name}`}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => openDeleteDialog(params.row)}
                  sx={{
                    border: "1px solid",
                    borderColor: "error.light",
                    borderRadius: 1.5,
                    "&:hover": { bgcolor: "error.50" },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage company employees, agents, roles, emails, and organizational departments
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<DomainIcon />}
            onClick={() => setDeptManagerOpen(true)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Manage Departments
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            New User
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          pageSizeOptions={[25, 50, 100]}
          sx={{ border: "none" }}
        />
      </Paper>

      {/* Create / Edit User Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingUser ? "Edit User" : "Create New User"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2.2} sx={{ mt: 1 }}>
            <TextField
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              size="small"
            />

            {/* Email Field: Admin can change email */}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              size="small"
              helperText={editingUser ? "Admin can change this user's email address" : undefined}
            />

            {/* Mobile Number Field */}
            <TextField
              label="Mobile Number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
              fullWidth
              size="small"
              helperText={
                role === "admin"
                  ? "🔒 Admin mobile numbers are protected and hidden from non-admin users"
                  : "User's contact mobile number"
              }
            />

            <TextField
              label={editingUser ? "New Password (optional)" : "Password"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required={!editingUser}
              helperText={editingUser ? "Leave blank to keep existing password" : "Minimum 8 characters"}
              size="small"
            />
            <TextField
              select
              label="Role"
              value={role}
              onChange={(e) => {
                const nextRole = e.target.value as Role;
                setRole(nextRole);
                if (nextRole === "admin") {
                  setIsActive(true);
                }
              }}
              fullWidth
              size="small"
            >
              <MenuItem value="employee">Employee</MenuItem>
              <MenuItem value="agent">Agent (IT Staff)</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </TextField>

            {/* Department Dropdown with specific list and manage link */}
            <Box>
              <TextField
                select
                label="Department"
                value={department}
                onChange={(e) => {
                  if (e.target.value === "__MANAGE_DEPARTMENTS__") {
                    setDeptManagerOpen(true);
                  } else {
                    setDepartment(e.target.value);
                  }
                }}
                fullWidth
                size="small"
                helperText="Select or customize departments from the list"
              >
                <MenuItem value="">
                  <em>— None / Unspecified —</em>
                </MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                  value="__MANAGE_DEPARTMENTS__"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <TuneIcon fontSize="small" />
                  + Manage / Add Departments...
                </MenuItem>
              </TextField>
            </Box>

            {/* Active / Inactive switch: REMOVED for admin profiles */}
            {editingUser && role !== "admin" && (
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    color="primary"
                  />
                }
                label="Account Active"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: "space-between" }}>
          {editingUser && currentAdminEmail && editingUser.email.toLowerCase() !== currentAdminEmail ? (
            <Button
              color="error"
              onClick={() => {
                setDialogOpen(false);
                openDeleteDialog(editingUser);
              }}
              startIcon={<DeleteOutlineIcon />}
              sx={{ textTransform: "none" }}
            >
              Delete User
            </Button>
          ) : (
            <Box />
          )}

          <Stack direction="row" spacing={1}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Delete User Account
        </DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to permanently delete this user account?
          </Typography>

          {userToDelete && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {userToDelete.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {userToDelete.email}
              </Typography>
              <Chip
                label={userToDelete.role.toUpperCase()}
                size="small"
                color={ROLE_COLORS[userToDelete.role]}
                sx={{ mt: 1, height: 20, fontSize: "0.68rem" }}
              />
            </Paper>
          )}

          <Typography variant="caption" color="text.secondary" display="block">
            * Note: Tickets created by this user will be reassigned to your administrator account to maintain audit history. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Management Dialog */}
      <Dialog
        open={deptManagerOpen}
        onClose={() => setDeptManagerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <DomainIcon color="primary" />
          Manage Departments List
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Admin can add or remove departments available across the user management and ticketing system.
          </Typography>

          {deptError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeptError(null)}>
              {deptError}
            </Alert>
          )}

          {/* Add Department Input */}
          <Box component="form" onSubmit={handleAddDepartment} sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="New Department Name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Cybersecurity, Quality Assurance"
                size="small"
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddIcon />}
                disabled={deptActionLoading || !newDeptName.trim()}
                sx={{ textTransform: "none", whiteSpace: "nowrap" }}
              >
                Add
              </Button>
            </Stack>
          </Box>

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Current Departments ({departments.length})
          </Typography>

          <Paper variant="outlined" sx={{ maxHeight: 280, overflowY: "auto", borderRadius: 1.5 }}>
            <List dense disablePadding>
              {departments.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No departments configured yet." />
                </ListItem>
              ) : (
                departments.map((dept, index) => (
                  <ListItem
                    key={dept}
                    divider={index < departments.length - 1}
                    sx={{ py: 1 }}
                  >
                    <ListItemText
                      primary={dept}
                      primaryTypographyProps={{ fontWeight: 500, fontSize: "0.875rem" }}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title={`Remove ${dept}`}>
                        <IconButton
                          edge="end"
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDepartment(dept)}
                          disabled={deptActionLoading}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeptManagerOpen(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}