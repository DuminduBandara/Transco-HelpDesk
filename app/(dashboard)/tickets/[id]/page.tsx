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
  Snackbar,
  Chip,
} from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
import type { Ticket, TicketComment } from "@/types";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isStaff = role === "agent" || role === "admin";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ticketRes, commentsRes] = await Promise.all([
      fetch(`/api/tickets/${params.id}`),
      fetch(`/api/tickets/${params.id}/comments`),
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
    setTicket(ticketData.ticket);
    setComments(commentsData.comments ?? []);
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
      setError(data.error ?? "Failed to update ticket.");
      return;
    }
    const data = await res.json();
    setTicket(data.ticket);
    if (patch.status) {
      setFeedback(`Status updated to "${patch.status}". An email alert has been sent to the ticket creator.`);
    } else {
      setFeedback("Ticket details updated successfully.");
    }
  }

  async function claimTicket() {
    setSaving(true);
    const res = await fetch(`/api/tickets/${params.id}/assign`, {
      method: "POST",
    });
    setSaving(false);
    if (res.ok) {
      setFeedback("Ticket claimed. An email notification has been dispatched to the creator.");
      load();
    }
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
      if (isStaff) {
        setFeedback("Comment posted. An email notification has been delivered to the ticket creator.");
      } else {
        setFeedback("Comment posted successfully.");
      }
      load();
    }
  }

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

        <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center" }}>
          <Chip
            icon={<MailOutlineIcon sx={{ fontSize: 16 }} />}
            label={`Email alerts enabled: ${ticket.created_by_name ?? "Ticket creator"} receives instant email notifications on status updates and agent comments`}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ fontSize: "0.75rem" }}
          />
        </Box>

        {isStaff && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Manage Ticket
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Updating ticket status will automatically dispatch an email alert to {ticket.created_by_name ?? "the creator"}.
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1, alignItems: "center", gap: 2 }}>
            {isStaff && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <MailOutlineIcon sx={{ fontSize: 15, color: "primary.main" }} />
                Posting will email the ticket creator
              </Typography>
            )}
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

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={5000}
        onClose={() => setFeedback(null)}
        message={feedback}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
