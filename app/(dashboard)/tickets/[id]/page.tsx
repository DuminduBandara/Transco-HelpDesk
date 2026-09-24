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
  Avatar,
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import type { Ticket, TicketComment, EmailNotification } from "@/types";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isStaff = role === "agent" || role === "admin";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [previewNotification, setPreviewNotification] = useState<EmailNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Internal Notes (Staff-only)
  const [internalNotesInput, setInternalNotesInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccessMessage, setNotesSuccessMessage] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ticketRes, commentsRes, notifRes] = await Promise.all([
      fetch(`/api/tickets/${params.id}`),
      fetch(`/api/tickets/${params.id}/comments`),
      fetch(`/api/notifications?ticket_id=${params.id}`),
    ]);

    if (ticketRes.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!ticketRes.ok) {
      setError("Failed to load ticket.");
      setLoading(false);
      return;
    }

    const ticketData = await ticketRes.json();
    const commentsData = await commentsRes.json();
    const notifData = notifRes.ok ? await notifRes.json() : { notifications: [] };

    setTicket(ticketData.ticket);
    setInternalNotesInput(ticketData.ticket?.internal_notes || "");
    setComments(commentsData.comments ?? []);
    setNotifications(notifData.notifications ?? []);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveInternalNotes() {
    if (!ticket) return;
    setSavingNotes(true);
    setError(null);
    setNotesSuccessMessage(null);

    try {
      const res = await fetch(`/api/tickets/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internal_notes: internalNotesInput.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save internal notes.");
        return;
      }

      const data = await res.json();
      setTicket(data.ticket);
      setInternalNotesInput(data.ticket?.internal_notes || "");
      setNotesSuccessMessage("Internal notes saved successfully.");
      setTimeout(() => setNotesSuccessMessage(null), 4000);
    } catch {
      setError("Network error saving internal notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function updateTicket(patch: Partial<Ticket>) {
    setSaving(true);
    setError(null);
    setStatusNotice(null);

    const res = await fetch(`/api/tickets/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update ticket.");
      return;
    }
    const data = await res.json();
    setTicket(data.ticket);

    if (patch.status === "resolved" || patch.status === "closed") {
      setStatusNotice(
        `Issue marked as ${patch.status}! Automated email notification has been dispatched to ${data.ticket.created_by_name || "the employee"}.`
      );
      // Refresh notifications list to show the dispatched resolution email
      fetch(`/api/notifications?ticket_id=${params.id}`)
        .then((r) => r.json())
        .then((d) => setNotifications(d.notifications ?? []))
        .catch(() => {});
    }
  }

  async function claimTicket() {
    setSaving(true);
    const res = await fetch(`/api/tickets/${params.id}/assign`, {
      method: "POST",
    });
    setSaving(false);
    if (res.ok) load();
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/tickets/${params.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: newComment }),
    });
    setPosting(false);
    if (res.ok) {
      setNewComment("");
      load();
    }
  }

  const hasUnsavedNotes =
    Boolean(ticket) && internalNotesInput !== (ticket?.internal_notes || "");

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

      {statusNotice && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon />}
          sx={{ mb: 2 }}
          onClose={() => setStatusNotice(null)}
        >
          {statusNotice}
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
            <Typography variant="body2">{ticket.created_by_name}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Assigned To
            </Typography>
            <Typography variant="body2">
              {ticket.assigned_to_name ?? "Unassigned"}
            </Typography>
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

              {!ticket.assigned_to && (
                <Button
                  variant="outlined"
                  onClick={claimTicket}
                  disabled={saving}
                >
                  Assign to Me
                </Button>
              )}
            </Stack>
          </>
        )}
      </Paper>
 
      {/* Internal Notes: Private to agents & admins to track progress without cluttering public comment feed */}
      {isStaff && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            border: "1px solid",
            borderColor: "warning.main",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 179, 0, 0.08)"
                : "rgba(255, 248, 230, 0.65)",
            borderRadius: 2,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={1.5}
            sx={{ mb: 1.5 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <LockOutlinedIcon color="warning" sx={{ fontSize: 26 }} />
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Internal Notes
                  </Typography>
                  <Chip
                    size="small"
                    label="Staff Only · Hidden from Employee"
                    color="warning"
                    variant="filled"
                    sx={{ fontWeight: 600, fontSize: "0.72rem", height: 22 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Private workspace for Agents & Admins. Track troubleshooting steps, hardware serials, vendor tickets, or handoffs without cluttering the public comment feed.
                </Typography>
              </Box>
            </Box>

            {ticket.internal_notes && !hasUnsavedNotes && (
              <Chip
                size="small"
                variant="outlined"
                color="default"
                label="Note Saved"
                sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 500 }}
              />
            )}
          </Stack>

          {notesSuccessMessage && (
            <Alert
              severity="success"
              sx={{ mb: 2, py: 0.5 }}
              onClose={() => setNotesSuccessMessage(null)}
            >
              {notesSuccessMessage}
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={12}
            placeholder="Type private troubleshooting findings, diagnostic commands, vendor RMA numbers, or shift handoff notes..."
            value={internalNotesInput}
            onChange={(e) => setInternalNotesInput(e.target.value)}
            disabled={savingNotes}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": {
                fontFamily: "inherit",
                fontSize: "0.95rem",
              },
            }}
          />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 1.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {hasUnsavedNotes ? (
                <Box component="span" sx={{ color: "warning.dark", fontWeight: 700 }}>
                  ● Unsaved changes
                </Box>
              ) : ticket.internal_notes ? (
                `Characters: ${internalNotesInput.length}`
              ) : (
                "No private notes recorded yet"
              )}
            </Typography>

            <Stack direction="row" spacing={1}>
              {hasUnsavedNotes && (
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  disabled={savingNotes}
                  onClick={() => setInternalNotesInput(ticket.internal_notes || "")}
                >
                  Discard
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={
                  savingNotes ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SaveOutlinedIcon fontSize="small" />
                  )
                }
                disabled={savingNotes || !hasUnsavedNotes}
                onClick={handleSaveInternalNotes}
                sx={{ fontWeight: 600 }}
              >
                {savingNotes ? "Saving..." : "Save Internal Note"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 4 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Comments ({comments.length})
        </Typography>

        <Stack spacing={2} sx={{ mb: 3 }}>
          {comments.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No comments yet.
            </Typography>
          )}
          {comments.map((c) => (
            <Stack direction="row" spacing={2} key={c.id}>
              <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
                {c.user_name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="body2" fontWeight={600}>
                    {c.user_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.user_role} · {c.created_at}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {c.comment}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Box component="form" onSubmit={submitComment}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={posting || !newComment.trim()}
            >
              {posting ? "Posting..." : "Post Comment"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Email Notifications Dispatched for this ticket */}
      <Paper sx={{ p: 4, mt: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <MailOutlineIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            Email Notifications Dispatched ({notifications.length})
          </Typography>
        </Stack>

        {notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No email notifications recorded for this ticket yet.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {notifications.map((n) => (
              <Box
                key={n.id}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.default",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                  spacing={1}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      color={
                        n.type === "ticket_resolved"
                          ? "success"
                          : n.type === "ticket_created_admin"
                          ? "warning"
                          : "primary"
                      }
                      label={
                        n.type === "ticket_resolved"
                          ? "Issue Resolved"
                          : n.type === "ticket_created_admin"
                          ? "Admin Alert"
                          : "Submission Receipt"
                      }
                      sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={n.status === "delivered" ? "Delivered (SMTP)" : "Logged / Simulated"}
                      color={n.status === "delivered" ? "success" : "default"}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      {n.subject}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {n.created_at}
                  </Typography>
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Recipient: <strong>{n.recipient_name}</strong> &lt;{n.recipient_email}&gt;
                  </Typography>

                  <Button
                    size="small"
                    variant="text"
                    startIcon={<MailOutlineIcon />}
                    onClick={() => setPreviewNotification(n)}
                  >
                    View Email Preview
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Rendered Email Preview Dialog */}
      {previewNotification && (
        <Dialog
          open={Boolean(previewNotification)}
          onClose={() => setPreviewNotification(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Notification Email Message
              </Typography>
              <Typography variant="caption" color="text.secondary">
                To: {previewNotification.recipient_name} ({previewNotification.recipient_email}) · {previewNotification.created_at}
              </Typography>
            </Box>
            <IconButton onClick={() => setPreviewNotification(null)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Box sx={{ p: 2, bgcolor: "grey.100", borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2">
                <strong>Subject:</strong> {previewNotification.subject}
              </Typography>
              <Typography variant="body2">
                <strong>Delivery Mode:</strong> {previewNotification.status}
              </Typography>
            </Box>
            {previewNotification.body_html ? (
              <Box
                sx={{ p: 2, maxHeight: 480, overflowY: "auto" }}
                dangerouslySetInnerHTML={{ __html: previewNotification.body_html }}
              />
            ) : (
              <Box sx={{ p: 3, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 13 }}>
                {previewNotification.body_text || "No preview available."}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPreviewNotification(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
