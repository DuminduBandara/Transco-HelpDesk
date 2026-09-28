"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import BadgeIcon from "@mui/icons-material/Badge";
import DomainIcon from "@mui/icons-material/Domain";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useSnackbar } from "notistack";
import type { SystemRole } from "@/types";

export default function AdminSettingsPage() {
  const { enqueueSnackbar } = useSnackbar();

  // Departments State
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [deptLoading, setDeptLoading] = useState(false);

  // Roles State
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);

  // Role Deletion Dialog State
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [deleteRoleConfirmOpen, setDeleteRoleConfirmOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/roles"),
      ]);

      const deptData = await deptRes.json();
      const roleData = await roleRes.json();

      if (deptData.departments) setDepartments(deptData.departments);
      if (roleData.roles) setRoles(roleData.roles);
    } catch {
      enqueueSnackbar("Failed to load system settings.", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Department Handlers ---
  async function handleAddDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setDeptLoading(true);

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim() }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to add department");
      
      setDepartments(data.departments);
      setNewDeptName("");
      enqueueSnackbar(`Department added successfully!`, { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setDeptLoading(false);
    }
  }

  async function handleDeleteDepartment(dept: string) {
    setDeptLoading(true);
    try {
      const res = await fetch(`/api/departments?name=${encodeURIComponent(dept)}`, { method: "DELETE" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to delete department");
      
      setDepartments(data.departments);
      enqueueSnackbar(`Department removed successfully!`, { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setDeptLoading(false);
    }
  }

  // --- Role Handlers ---
  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setRoleLoading(true);

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim() || null,
        }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to add role");
      
      setNewRoleName("");
      setNewRoleDesc("");
      loadData();
      enqueueSnackbar(`Role added successfully!`, { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setRoleLoading(false);
    }
  }

  // Opens the confirmation dialog
  function confirmDeleteRole(roleName: string) {
    setRoleToDelete(roleName);
    setDeleteRoleConfirmOpen(true);
  }

  // Executes the deletion after confirmation
  async function executeDeleteRole() {
    if (!roleToDelete) return;
    
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/roles?name=${encodeURIComponent(roleToDelete)}`, { method: "DELETE" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to delete role");
      
      loadData();
      setDeleteRoleConfirmOpen(false);
      setRoleToDelete(null);
      enqueueSnackbar(`Role removed successfully!`, { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: "error" });
      // If error occurs, close dialog so user isn't stuck
      setDeleteRoleConfirmOpen(false); 
      setRoleToDelete(null);
    } finally {
      setRoleLoading(false);
    }
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <ManageAccountsOutlinedIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Roles & Departments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage global departments and custom access roles for your system
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={4}>
        {/* --- DEPARTMENTS COLUMN --- */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <DomainIcon color="primary" /> Departments
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box component="form" onSubmit={handleAddDepartment} sx={{ mb: 3 }}>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="New Department Name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Cybersecurity"
                  size="small"
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<AddIcon />}
                  disabled={deptLoading || !newDeptName.trim()}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  Add
                </Button>
              </Stack>
            </Box>

            <Paper variant="outlined" sx={{ maxHeight: 400, overflowY: "auto", borderRadius: 1.5 }}>
              <List dense disablePadding>
                {departments.length === 0 ? (
                  <ListItem><ListItemText primary="No departments configured." /></ListItem>
                ) : (
                  departments.map((dept, index) => (
                    <ListItem key={dept} divider={index < departments.length - 1}>
                      <ListItemText primary={dept} primaryTypographyProps={{ fontWeight: 500 }} />
                      <ListItemSecondaryAction>
                        <Tooltip title={`Remove ${dept}`}>
                          <IconButton edge="end" size="small" color="error" onClick={() => handleDeleteDepartment(dept)} disabled={deptLoading}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Paper>
        </Grid>

        {/* --- ROLES COLUMN --- */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <BadgeIcon color="primary" /> User Roles
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box component="form" onSubmit={handleAddRole} sx={{ mb: 3 }}>
              <Stack spacing={2}>
                <TextField
                  label="New Role Name (e.g. manager, lead_agent)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    label="Description"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<AddIcon />}
                    disabled={roleLoading || !newRoleName.trim()}
                    sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                  >
                    Add
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Paper variant="outlined" sx={{ maxHeight: 350, overflowY: "auto", borderRadius: 1.5 }}>
              <List dense disablePadding>
                {roles.map((r, index) => {
                  return (
                    <ListItem key={r.id} divider={index < roles.length - 1}>
                      <ListItemText 
                        primary={r.name.toUpperCase()} 
                        secondary={r.description || "No description"}
                        primaryTypographyProps={{ fontWeight: 600 }} 
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title={`Remove ${r.name}`}>
                          <IconButton edge="end" size="small" color="error" onClick={() => confirmDeleteRole(r.name)} disabled={roleLoading}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  )
                })}
              </List>
            </Paper>
          </Paper>
        </Grid>
      </Grid>

      {/* Role Deletion Confirmation Dialog */}
      <Dialog
        open={deleteRoleConfirmOpen}
        onClose={() => !roleLoading && setDeleteRoleConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Delete User Role
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to permanently delete the <strong>{roleToDelete?.toUpperCase()}</strong> role?
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            * Note: If there are any users currently assigned to this role, or if it is a mandatory system role, the deletion will be blocked to ensure stability.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteRoleConfirmOpen(false)} disabled={roleLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={executeDeleteRole}
            disabled={roleLoading}
          >
            {roleLoading ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}