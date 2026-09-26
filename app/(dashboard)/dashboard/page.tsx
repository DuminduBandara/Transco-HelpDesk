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
import ActivityFeed from "@/components/ActivityFeed";
import type { Ticket, ActivityItem } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface StatusCount {
  status: string;
  count: number;
}

interface PriorityCount {
  priority: string;
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
  const [loading, setLoading] = useState(true);
  const [byStatus, setByStatus] = useState<StatusCount[]>([]);
  const [byPriority, setByPriority] = useState<PriorityCount[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Monthly report state (admin only)
  const defaultMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [reportMonth, setReportMonth] = useState(defaultMonth);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const res = await fetch("/api/activities?limit=15");
      const data = await res.json();
      setActivities(data.activities ?? []);
    } catch (err) {
      console.error("Failed to load activities", err);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!role) return;

    async function load() {
      setLoading(true);
      try {
        if (role === "employee") {
          const [ticketsRes, actRes] = await Promise.all([
            fetch("/api/tickets?pageSize=100"),
            fetch("/api/activities?limit=15"),
          ]);
          const data = await ticketsRes.json();
          const actData = await actRes.json();
          const tickets: Ticket[] = data.tickets ?? [];
          const counts: Record<string, number> = {};
          const pCounts: Record<string, number> = {};
          for (const t of tickets) {
            counts[t.status] = (counts[t.status] ?? 0) + 1;
            pCounts[t.priority] = (pCounts[t.priority] ?? 0) + 1;
          }
          setByStatus(
            Object.entries(counts).map(([status, count]) => ({ status, count }))
          );
          setByPriority(
            Object.entries(pCounts).map(([priority, count]) => ({ priority, count }))
          );
          setRecentTickets(tickets.slice(0, 6));
          setActivities(actData.activities ?? []);
        } else {
          const [statsRes, ticketsRes, actRes] = await Promise.all([
            fetch("/api/stats"),
            fetch("/api/tickets?pageSize=6"),
            fetch("/api/activities?limit=15"),
          ]);
          const statsData = await statsRes.json();
          const ticketsData = await ticketsRes.json();
          const actData = await actRes.json();
          setByStatus(statsData.byStatus ?? []);
          setByPriority(statsData.byPriority ?? []);
          setUnassigned(statsData.unassigned ?? 0);
          setRecentTickets(ticketsData.tickets ?? []);
          setActivities(actData.activities ?? []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [role]);

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

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const priorityConfig = [
    { key: "urgent", label: "Urgent", color: "#d32f2f" },
    { key: "high", label: "High", color: "#ed6c02" },
    { key: "medium", label: "Medium", color: "#1565c0" },
    { key: "low", label: "Low", color: "#2e7d32" },
  ];

  const chartData = priorityConfig.map((item) => {
    const found = byPriority.find((p) => p.priority?.toLowerCase() === item.key);
    return {
      priority: item.label,
      count: found ? Number(found.count) : 0,
      color: item.color,
    };
  });

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Welcome back, {session?.user?.name?.split(" ")[0]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of support requests and ticketing activity
          </Typography>
        </Box>
        <Button component={Link} href="/tickets/new" variant="contained">
          New Ticket
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ConfirmationNumberIcon />}
            label="New"
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
              label="Unassigned (New)"
              value={unassigned}
              color="#c62828"
            />
          )}
        </Grid>
      </Grid>

      {/* Priority Distribution Chart Card */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Priority Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ticket workload breakdown by severity to identify urgent requests
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {chartData.map((item) => (
              <Box
                key={item.priority}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  bgcolor: "action.hover",
                  borderRadius: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: item.color,
                  }}
                />
                <Typography variant="caption" fontWeight={600}>
                  {item.priority}:
                </Typography>
                <Typography variant="caption" fontWeight={700} color={item.color}>
                  {item.count}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>

        <Box sx={{ width: "100%", height: 240, pt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
            >
              <XAxis dataKey="priority" tickLine={false} />
              <YAxis allowDecimals={false} tickLine={false} />
              <Tooltip
                formatter={(val: any) => [`${val ?? 0} Tickets`, "Count"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e0e0e0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

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

      {/* Activity Feed Section */}
      <Box sx={{ mb: 4 }}>
        <ActivityFeed
          activities={activities}
          loading={activitiesLoading}
          onRefresh={fetchActivities}
        />
      </Box>

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
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No tickets recorded yet.</Typography>
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

