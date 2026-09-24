"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useRealtime } from "@/hooks/useRealtime";
import type { EmailNotification } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function NotificationCenterModal({ open, onClose, isAdmin }: Props) {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpHost, setSmtpHost] = useState<string | null>(null);

  // Preview single email
  const [previewItem, setPreviewItem] = useState<EmailNotification | null>(null);

  // Test email state
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmailInput, setTestEmailInput] = useState("");
  const [showTestForm, setShowTestForm] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setSmtpConfigured(Boolean(data.smtpConfigured));
        setSmtpHost(data.smtpHost ?? null);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadNotifications();
      setTestResult(null);
    }
  }, [open]);

  // Live real-time update when new notifications are created
  useRealtime(["notification:created"], () => {
    if (open) {
      loadNotifications();
    }
  });

  async function handleSendTestEmail() {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmailInput || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Test email dispatched to ${data.recipient} (${data.status === "delivered" ? "Delivered via SMTP" : "Recorded in simulation mode"}).`,
        });
        loadNotifications();
        setShowTestForm(false);
      } else {
        setTestResult({
          success: false,
          message: data.error || "Failed to send test email.",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: (err as Error).message || "Network error sending test email.",
      });
    } finally {
      setSendingTest(false);
    }
  }

  function getStatusChip(status: EmailNotification["status"]) {
    switch (status) {
      case "delivered":
        return (
          <Chip
            size="small"
            color="success"
            variant="filled"
            icon={<CheckCircleOutlineIcon />}
            label="Delivered (SMTP)"
            sx={{ fontWeight: 600 }}
          />
        );
      case "simulated":
        return (
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            icon={<InfoOutlinedIcon />}
            label="Simulated / Dev Log"
            sx={{ fontWeight: 500 }}
          />
        );
      default:
        return (
          <Chip
            size="small"
            color="error"
            variant="filled"
            label="Failed"
            sx={{ fontWeight: 600 }}
          />
        );
    }
  }

  function getTypeLabel(type: EmailNotification["type"]) {
    switch (type) {
      case "ticket_created_admin":
        return "New Ticket (Admin Alert)";
      case "ticket_created_employee":
        return "Ticket Received (Employee)";
      case "ticket_resolved":
        return "Issue Fixed (Resolution)";
      case "password_reset":
        return "Password Reset Link";
      case "test":
        return "Diagnostic Test";
      default:
        return type;
    }
  }

  return (
    <>
      <Dialog open={open && !previewItem} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <MailOutlineIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Email Notifications & Outbox
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Automated dispatch for new ticket submissions and issue fixes
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Refresh list">
              <IconButton size="small" onClick={loadNotifications} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {/* SMTP Configuration Status Banner */}
          <PaperBanner
            smtpConfigured={smtpConfigured}
            smtpHost={smtpHost}
            isAdmin={isAdmin}
            onToggleTest={() => setShowTestForm(!showTestForm)}
          />

          {testResult && (
            <Alert
              severity={testResult.success ? "success" : "error"}
              sx={{ mb: 2 }}
              onClose={() => setTestResult(null)}
            >
              {testResult.message}
            </Alert>
          )}

          {showTestForm && (
            <Box
              sx={{
                p: 2,
                mb: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.default",
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Send Diagnostic Test Email
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Dispatches a sample notification to verify SMTP delivery settings.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Target email (leave blank for your own account)"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                />
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={sendingTest ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  disabled={sendingTest}
                  onClick={handleSendTestEmail}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {sendingTest ? "Sending..." : "Send Test"}
                </Button>
                <Button size="medium" onClick={() => setShowTestForm(false)}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <MailOutlineIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                No notifications dispatched yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: "auto", mt: 0.5 }}>
                When an employee creates a ticket or an IT admin marks an issue as resolved, notifications will appear here.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {notifications.map((n) => (
                <Box
                  key={n.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    transition: "border-color 0.2s",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ sm: "center" }}
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      {getStatusChip(n.status)}
                      <Chip
                        size="small"
                        variant="outlined"
                        label={getTypeLabel(n.type)}
                        sx={{ fontSize: "0.75rem" }}
                      />
                      {n.ticket_id && (
                        <Link
                          href={`/tickets/${n.ticket_id}`}
                          onClick={onClose}
                          style={{ textDecoration: "none" }}
                        >
                          <Chip
                            size="small"
                            color="info"
                            label={`Ticket #${n.ticket_id}`}
                            icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                            clickable
                            sx={{ cursor: "pointer" }}
                          />
                        </Link>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {n.created_at}
                    </Typography>
                  </Stack>

                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                    {n.subject}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Recipient: <strong>{n.recipient_name}</strong> &lt;{n.recipient_email}&gt;
                  </Typography>

                  {n.error_message && (
                    <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                      SMTP error: {n.error_message}
                    </Alert>
                  )}

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setPreviewItem(n)}
                      startIcon={<MailOutlineIcon />}
                    >
                      View Rendered Email
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rendered Email Preview Dialog */}
      {previewItem && (
        <Dialog
          open={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Email Message Preview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sent to: {previewItem.recipient_name} ({previewItem.recipient_email}) · {previewItem.created_at}
              </Typography>
            </Box>
            <IconButton onClick={() => setPreviewItem(null)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Box sx={{ p: 2, bgcolor: "grey.100", borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2">
                <strong>Subject:</strong> {previewItem.subject}
              </Typography>
              <Typography variant="body2">
                <strong>To:</strong> {previewItem.recipient_name} &lt;{previewItem.recipient_email}&gt;
              </Typography>
              <Typography variant="body2">
                <strong>Delivery Status:</strong> {previewItem.status}
              </Typography>
            </Box>
            {previewItem.body_html ? (
              <Box
                sx={{ p: 2, maxHeight: 500, overflowY: "auto" }}
                dangerouslySetInnerHTML={{ __html: previewItem.body_html }}
              />
            ) : (
              <Box sx={{ p: 3, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 13 }}>
                {previewItem.body_text || "No preview available."}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPreviewItem(null)}>Back to Outbox</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

function PaperBanner({
  smtpConfigured,
  smtpHost,
  isAdmin,
  onToggleTest,
}: {
  smtpConfigured: boolean;
  smtpHost: string | null;
  isAdmin?: boolean;
  onToggleTest: () => void;
}) {
  return (
    <Box
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 2,
        bgcolor: smtpConfigured ? "success.50" : "info.50",
        border: "1px solid",
        borderColor: smtpConfigured ? "success.200" : "info.200",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color={smtpConfigured ? "success.900" : "info.900"}>
            {smtpConfigured
              ? `Real SMTP Delivery Active (${smtpHost})`
              : "Email Simulation / Dev Mode Active"}
          </Typography>
          <Typography variant="body2" color={smtpConfigured ? "success.800" : "info.800"} sx={{ mt: 0.5 }}>
            {smtpConfigured
              ? "All notification emails are dispatched live through your configured SMTP mail server."
              : "Emails are captured and rendered in this outbox log. To enable real inbox delivery, set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment."}
          </Typography>
        </Box>

        {isAdmin && (
          <Button
            size="small"
            variant="contained"
            color={smtpConfigured ? "success" : "primary"}
            onClick={onToggleTest}
            startIcon={<SendIcon />}
            sx={{ whiteSpace: "nowrap" }}
          >
            Test Delivery
          </Button>
        )}
      </Stack>
    </Box>
  );
}
