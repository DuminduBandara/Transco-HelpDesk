"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Stack,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";
import { useRealtime } from "@/hooks/useRealtime";
import type { Ticket } from "@/types";

interface StatusCount {
  status: string;
  count: number;
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Paper elevation={1} sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
      <Box
        sx={{
          bgcolor: color,
          color: "white",
          borderRadius: "50%",
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [byStatus, setByStatus] = useState<StatusCount[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [totalUsers, setTotalUsers] = useState<number | undefined>();
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);

  // Monthly report state (admin only)
  const defaultMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [reportMonth, setReportMonth] = useState(defaultMonth);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      if (role === "employee") {
        const res = await fetch("/api/tickets?pageSize=100");
        const data = await res.json();
        const tickets: Ticket[] = data.tickets ?? [];
        const counts: Record<string, number> = {};
        for (const t of tickets) {
          counts[t.status] = (counts[t.status] ?? 0) + 1;
        }
        setByStatus(
          Object.entries(counts).map(([status, count]) => ({ status, count }))
        );
        setRecentTickets(tickets.slice(0, 6));
      } else {
        const [statsRes, ticketsRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/tickets?pageSize=6"),
        ]);
        const statsData = await statsRes.json();
        const ticketsData = await ticketsRes.json();
        setByStatus(statsData.byStatus ?? []);
        setUnassigned(statsData.unassigned ?? 0);
        setTotalUsers(statsData.totalUsers);
        setRecentTickets(ticketsData.tickets ?? []);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => {
    if (!mounted || !role) return;
    loadData(false);
  }, [mounted, role, loadData]);

  // Connect to live real-time event stream
  const { isConnected, lastSyncTime } = useRealtime(
    ["ticket:created", "ticket:updated", "ticket:deleted", "stats:updated"],
    () => {
      // Whenever tickets, status, or stats change anywhere in the system, refresh live in background
      loadData(true);
    }
  );

  const getCount = (status: string) =>
    byStatus.find((s) => s.status === status)?.count ?? 0;

  async function handleDownloadReport() {
    setDownloadingReport(true);
    setReportError(null);
    try {
      const res = await fetch(
        `/api/reports/monthly?month=${encodeURIComponent(reportMonth)}&format=csv`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download monthly report.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `IT-HelpDesk-Monthly-Report-${reportMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setReportError((err as Error).message);
    } finally {
      setDownloadingReport(false);
    }
  }

  if (!mounted || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Welcome back, {session?.user?.name?.split(" ")[0]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live overview of support requests and ticketing activity
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <RealtimeIndicator
            isConnected={isConnected}
            lastSyncTime={lastSyncTime}
            onRefresh={() => loadData(false)}
            isRefreshing={refreshing}
          />
          <Button component={Link} href="/tickets/new" variant="contained">
            Submit a Ticket
          </Button>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ConfirmationNumberIcon />}
            label="Open"
            value={getCount("open")}
            color="#1565c0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<HourglassEmptyIcon />}
            label="In Progress"
            value={getCount("in_progress")}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<CheckCircleIcon />}
            label="Resolved"
            value={getCount("resolved")}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {role === "employee" ? (
            <StatCard
              icon={<ConfirmationNumberIcon />}
              label="Closed"
              value={getCount("closed")}
              color="#616161"
            />
          ) : (
            <StatCard
              icon={<PersonOffIcon />}
              label="Unassigned (open)"
              value={unassigned}
              color="#c62828"
            />
          )}
        </Grid>

        {role === "admin" && totalUsers !== undefined && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<ConfirmationNumberIcon />}
              label="Total Users"
              value={totalUsers}
              color="#546e7a"
            />
          </Grid>
        )}
      </Grid>

      {/* Admin Monthly Report Download Card */}
      {role === "admin" && (
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "primary.light",
            bgcolor: "background.paper",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  borderRadius: 2,
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AssessmentIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Monthly Help Desk Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Download end-of-month ticket summaries, resolution rates, and detailed records in CSV format.
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: "100%", md: "auto" } }}>
              <TextField
                type="month"
                size="small"
                label="Report Month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 170 }}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={
                  downloadingReport ? <CircularProgress size={18} color="inherit" /> : <FileDownloadIcon />
                }
                disabled={downloadingReport}
                onClick={handleDownloadReport}
                sx={{ whiteSpace: "nowrap" }}
              >
                {downloadingReport ? "Generating..." : "Download Report"}
              </Button>
            </Stack>
          </Stack>

          {reportError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setReportError(null)}>
              {reportError}
            </Alert>
          )}
        </Paper>
      )}

      {/* Latest / Recent Tickets Section */}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Latest Tickets
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Most recent support tickets submitted across the platform
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/tickets"
            endIcon={<ArrowForwardIcon />}
            size="small"
          >
            View All Tickets
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {recentTickets.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
                color: "text.secondary",
              }}
            >
              <ConfirmationNumberIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              No Tickets Created Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: "auto", mb: 3 }}>
              When employees or staff create support tickets, they will automatically appear here and sync in real time.
            </Typography>
            <Button component={Link} href="/tickets/new" variant="contained" size="small">
              Submit the First Ticket
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 70 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 140 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 140 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 160 }}>Reported By</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 160 }}>Assigned To</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 160 }}>Created</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: 90 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTickets.map((t) => (
                  <TableRow
                    key={t.id}
                    hover
                    sx={{
                      cursor: "pointer",
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>#{t.id}</TableCell>
                    <TableCell>
                      <Link
                        href={`/tickets/${t.id}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          fontWeight: 500,
                        }}
                      >
                        {t.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={t.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>{t.category_name ?? "—"}</TableCell>
                    <TableCell>{t.created_by_name ?? "—"}</TableCell>
                    <TableCell>
                      {t.assigned_to_name ? (
                        t.assigned_to_name
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
                      {t.created_at}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={Link}
                        href={`/tickets/${t.id}`}
                        size="small"
                        variant="outlined"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

