"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
} from "@mui/material";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonOffIcon from "@mui/icons-material/PersonOff";

interface StatusCount {
  status: string;
  count: number;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

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
  const [unassigned, setUnassigned] = useState(0);
  const [totalUsers, setTotalUsers] = useState<number | undefined>();

  useEffect(() => {
    if (!role) return;

    async function load() {
      setLoading(true);
      if (role === "employee") {
        const res = await fetch("/api/tickets?pageSize=100");
        const data = await res.json();
        const counts: Record<string, number> = {};
        for (const t of data.tickets ?? []) {
          counts[t.status] = (counts[t.status] ?? 0) + 1;
        }
        setByStatus(
          Object.entries(counts).map(([status, count]) => ({ status, count }))
        );
      } else {
        const res = await fetch("/api/stats");
        const data = await res.json();
        setByStatus(data.byStatus ?? []);
        setUnassigned(data.unassigned ?? 0);
        setTotalUsers(data.totalUsers);
      }
      setLoading(false);
    }
    load();
  }, [role]);

  const getCount = (status: string) =>
    byStatus.find((s) => s.status === status)?.count ?? 0;

  if (loading) {
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
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Welcome back, {session?.user?.name?.split(" ")[0]}
        </Typography>
        <Button component={Link} href="/tickets/new" variant="contained">
          Submit a Ticket
        </Button>
      </Box>

      <Grid container spacing={3}>
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

      <Box sx={{ mt: 4 }}>
        <Button component={Link} href="/tickets" variant="outlined">
          View All Tickets
        </Button>
      </Box>
    </Box>
  );
}
