"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
import type { Ticket } from "@/types";
import { useSnackbar } from "notistack";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isStaff = role === "agent" || role === "admin";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);


  // Initialize the notistack hook
  const { enqueueSnackbar } = useSnackbar();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/tickets/${params.id}`);

    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Failed to load ticket.");
      setLoading(false);
      return;
    }

    const ticketData = await res.json();
    setTicket(ticketData.ticket);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateTicket(patch: Partial<Ticket>) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tickets/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errorMessage = data.error ?? "Failed to update ticket.";
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: "error" });
      return;
    }
    const data = await res.json();
    setTicket(data.ticket);

    // Trigger specific success popups based on what was updated
    if (patch.status) {
      if (patch.status === "in_progress") {
        enqueueSnackbar("Ticket moved to IN PROGRESS and automatically assigned to you!", { variant: "success" });
      } else {
        enqueueSnackbar(`Ticket status updated to ${patch.status.toUpperCase()}`, { variant: "success" });
      }
    } else if (patch.priority) {
      enqueueSnackbar(`Ticket priority updated to ${patch.priority.toUpperCase()}`, { variant: "success" });
    } else {
      enqueueSnackbar("Ticket updated successfully", { variant: "success" });
    }
  }

  async function reopenTicket() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${params.id}/reopen`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMessage = data.error || "Failed to reopen ticket.";
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: "error" });
      } else {
        setReopenDialogOpen(false);
        enqueueSnackbar("Ticket reopened successfully! IT Support has been notified.", {
          variant: "success",
        });
        load();
      }
    } catch {
      setError("An unexpected error occurred while reopening ticket.");
      enqueueSnackbar("An unexpected error occurred.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  const isCreator =
    String(ticket?.created_by) === String(session?.user?.id) ||
    Boolean(
      ticket?.created_by_email &&
        ticket?.created_by_email?.toLowerCase() === session?.user?.email?.toLowerCase()
    );

  const canReopen =
    Boolean(ticket && (ticket.status === "resolved" || ticket.status === "closed")) &&
    isCreator &&
    role !== "admin";


  if (loading) {

    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound) {
    return <Alert severity="warning">Ticket not found.</Alert>;
  }

  if (!ticket) {
    return <Alert severity="error">{error ?? "Unable to load ticket."}</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Button onClick={() => router.push("/tickets")} sx={{ mb: 2 }}>
        ← Back to Tickets
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "flex-start" }}
          spacing={2}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              Ticket #{ticket.id}
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {ticket.title}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <StatusChip status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 3 }}>
          {ticket.description}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Reported By
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {ticket.created_by_name}
            </Typography>
            {ticket.created_by_email && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", wordBreak: "break-all" }}>
                ✉️ {ticket.created_by_email}
              </Typography>
            )}
            {ticket.created_by_mobile && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                📞 {ticket.created_by_mobile}
              </Typography>
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Assigned To
            </Typography>
            <Typography variant="body2" fontWeight={ticket.assigned_to_name ? 600 : 400}>
              {ticket.assigned_to_name ?? "Unassigned"}
            </Typography>
            {ticket.assigned_to_email && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", wordBreak: "break-all" }}>
                ✉️ {ticket.assigned_to_email}
              </Typography>
            )}
            {ticket.assigned_to_mobile && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                📞 {ticket.assigned_to_mobile}
              </Typography>
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Category
            </Typography>
            <Typography variant="body2">
              {ticket.category_name ?? "—"}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body2">{ticket.created_at}</Typography>
          </Grid>
        </Grid>

        {isStaff && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Manage Ticket
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                size="small"
                label="Status"
                value={ticket.status}
                onChange={(e) =>
                  updateTicket({ status: e.target.value as Ticket["status"] })
                }
                disabled={saving}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Priority"
                value={ticket.priority}
                onChange={(e) =>
                  updateTicket({
                    priority: e.target.value as Ticket["priority"],
                  })
                }
                disabled={saving}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Stack>
          </>
        )}

        {/* Reopen Ticket Option for Staff & Employee / Creator */}
        {canReopen && (
          <Box
            sx={{
              mt: 3,
              p: 2.5,
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(234, 88, 12, 0.15)" : "#fff7ed",
              border: "1px solid #fdba74",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#9a3412", fontWeight: 700 }}>
                Still experiencing this issue?
              </Typography>
              <Typography variant="body2" sx={{ color: "#7c2d12", mt: 0.5 }}>
                If your problem is not resolved to your satisfaction, you can reopen this ticket to request further assistance from IT Support.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="warning"
              onClick={() => setReopenDialogOpen(true)}
              disabled={saving}
              sx={{ whiteSpace: "nowrap" }}
            >
              Reopen Ticket
            </Button>
          </Box>
        )}
      </Paper>

      {/* Confirmation Dialog to Reopen Ticket */}
      <Dialog
        open={reopenDialogOpen}
        onClose={() => !saving && setReopenDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Reopen This Ticket?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will change the ticket status back to <strong>OPEN</strong> and immediately alert the IT Support team that the issue is still persisting.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReopenDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={reopenTicket}
            disabled={saving}
          >
            {saving ? "Reopening..." : "Yes, Reopen Ticket"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}