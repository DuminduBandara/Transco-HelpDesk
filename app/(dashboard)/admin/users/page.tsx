// app/(dashboard)/admin/users/page.tsx
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
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { User, Role, SystemRole } from "@/types";
import { useSnackbar } from "notistack";

const ROLE_COLORS: Record<string, any> = {
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

  // Departments and Roles state for dropdowns
  const [departments, setDepartments] = useState<string[]>([]);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);

  // User form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [department, setDepartment] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, rolesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/departments"),
        fetch("/api/roles")
      ]);

      const usersData = await usersRes.json();
      const deptsData = await deptsRes.json();
      const rolesData = await rolesRes.json();

      if (usersData.users) setUsers(usersData.users);
      if (deptsData.departments) setDepartments(deptsData.departments);
      if (rolesData.roles) setSystemRoles(rolesData.roles);
    } catch {
      // errors silently handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete user.");
        enqueueSnackbar("Failed to delete user account.", { variant: "error" });
        return;
      }

      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      loadData();
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
        is_active: role === "admin" ? true : Boolean(isActive),
      };
      
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
    loadData();
    enqueueSnackbar(editingUser ? "User profile updated!" : "User account created!", { variant: "success" });
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
        if (!phone) return <Typography variant="caption" color="text.secondary">—</Typography>;
        return (
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ height: "100%" }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
              {phone}
            </Typography>
            {isAdmin && (
              <Tooltip title="Admin mobile number: Protected and hidden from non-admin users">
                <Chip label="Private" size="small" variant="outlined" color="warning" sx={{ height: 18, fontSize: "0.62rem", px: 0.2, fontWeight: 600 }} />
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
      renderCell: (params) => {
        const roleData = systemRoles.find(r => r.name === params.value);
        const color = roleData?.color_code || ROLE_COLORS[params.value as string] || "default";
        return <Chip label={params.value} size="small" color={color} />;
      },
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
        if (params.row.role === "admin") {
          return <Chip label="Active" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />;
        }
        return <Chip label={params.value ? "Active" : "Disabled"} size="small" color={params.value ? "success" : "default"} />;
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
              sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.78rem", py: 0.3, px: 1, borderRadius: 1.5 }}
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
                  sx={{ border: "1px solid", borderColor: "error.light", borderRadius: 1.5, "&:hover": { bgcolor: "error.50" } }}
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

  const availableRoles = systemRoles.length > 0 
    ? systemRoles.map(r => r.name)
    : ["employee", "agent", "admin"];

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>User Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage company employees, roles, and accounts
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ textTransform: "none", fontWeight: 600 }}>
          New User
        </Button>
      </Stack>

      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          sx={{ border: "none" }}
        />
      </Paper>

      {/* Create / Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingUser ? "Edit User" : "Create New User"}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2.2} sx={{ mt: 1 }}>
            <TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required size="small" />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required size="small" helperText={editingUser ? "Admin can change this user's email address" : undefined} />
            <TextField label="Mobile Number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="e.g. +1 (555) 019-2834" fullWidth size="small" helperText={role === "admin" ? "🔒 Admin mobile numbers are hidden from non-admin users" : "User's contact mobile number"} />
            <TextField label={editingUser ? "New Password (optional)" : "Password"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth required={!editingUser} helperText={editingUser ? "Leave blank to keep existing password" : "Minimum 8 characters"} size="small" />
            
            <TextField select label="Role" value={role} onChange={(e) => { const nextRole = e.target.value as Role; setRole(nextRole); if (nextRole === "admin") setIsActive(true); }} fullWidth size="small">
              {availableRoles.map((r) => (
                <MenuItem key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>

            <TextField select label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} fullWidth size="small">
              <MenuItem value=""><em>— None / Unspecified —</em></MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </TextField>

            {editingUser && role !== "admin" && (
              <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />} label="Account Active" />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: "space-between" }}>
          {editingUser && currentAdminEmail && editingUser.email.toLowerCase() !== currentAdminEmail ? (
            <Button color="error" onClick={() => { setDialogOpen(false); openDeleteDialog(editingUser); }} startIcon={<DeleteOutlineIcon />} sx={{ textTransform: "none" }}>Delete User</Button>
          ) : <Box />}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}</Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => !deleting && setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" /> Delete User Account
        </DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography variant="body2" sx={{ mb: 1.5 }}>Are you sure you want to permanently delete this user account?</Typography>
          {userToDelete && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>{userToDelete.name}</Typography>
              <Typography variant="body2" color="text.secondary">{userToDelete.email}</Typography>
              <Chip label={userToDelete.role.toUpperCase()} size="small" color={systemRoles.find(r => r.name === userToDelete.role)?.color_code || ROLE_COLORS[userToDelete.role] || "default"} sx={{ mt: 1, height: 20, fontSize: "0.68rem" }} />
            </Paper>
          )}
          <Typography variant="caption" color="text.secondary" display="block">
            * Note: Tickets created by this user will be reassigned to your administrator account to maintain audit history. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={deleting}>{deleting ? "Deleting..." : "Confirm Delete"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}