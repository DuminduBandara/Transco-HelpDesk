"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Typography,
  Paper,
  MenuItem,
  TextField,
  Stack,
  InputAdornment,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";
import { useRealtime } from "@/hooks/useRealtime";
import type { Ticket, Category } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function TicketsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isStaff = session?.user?.role === "agent" || session?.user?.role === "admin";

  const [rows, setRows] = useState<Ticket[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [mounted, setMounted] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search input changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(paginationModel.page + 1),
      pageSize: String(paginationModel.pageSize),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (categoryId) params.set("category_id", categoryId);

    try {
      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(Array.isArray(data.tickets) ? data.tickets : []);
        setRowCount(typeof data.total === "number" ? data.total : 0);
      } else {
        setRows([]);
        setRowCount(0);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, priority, categoryId, paginationModel]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Connect to live real-time event stream
  const { isConnected, lastSyncTime } = useRealtime(
    ["ticket:created", "ticket:updated", "ticket:deleted"],
    () => {
      loadTickets();
    }
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handlePriorityChange = (val: string) => {
    setPriority(val);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleCategoryChange = (val: string) => {
    setCategoryId(val);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const columns: GridColDef<Ticket>[] = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "title",
      headerName: "Title",
      flex: 1,
      minWidth: 240,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", overflow: "hidden" }}>
          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
            {params.value}
          </Typography>
          {isStaff && Boolean(params.row.internal_notes) && (
            <Tooltip
              title={`Internal Staff Note: ${String(params.row.internal_notes).slice(0, 100)}${
                String(params.row.internal_notes).length > 100 ? "..." : ""
              }`}
            >
              <Chip
                size="small"
                icon={<LockOutlinedIcon sx={{ fontSize: "13px !important" }} />}
                label="Note"
                color="warning"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600, flexShrink: 0 }}
              />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: "priority",
      headerName: "Priority",
      width: 130,
      renderCell: (params) => <PriorityBadge priority={params.value} />,
    },
    {
      field: "category_name",
      headerName: "Category",
      width: 150,
      valueGetter: (_value, row) => row.category_name ?? "—",
    },
    {
      field: "created_by_name",
      headerName: "Reported By",
      width: 160,
    },
    {
      field: "assigned_to_name",
      headerName: "Assigned To",
      width: 160,
      valueGetter: (_value, row) => row.assigned_to_name ?? "Unassigned",
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 170,
    },
  ];

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
          Tickets
        </Typography>
        <RealtimeIndicator
          isConnected={isConnected}
          lastSyncTime={lastSyncTime}
          onRefresh={loadTickets}
          isRefreshing={loading}
        />
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", lg: "center" }}
        >
          <TextField
            size="small"
            placeholder="Search tickets by title or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="clear search"
                    onClick={() => setSearchInput("")}
                    edge="end"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{ flex: 1, minWidth: { xs: "100%", lg: 320 } }}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flexWrap: "wrap" }}>
            <TextField
              select
              size="small"
              label="Status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Priority"
              value={priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Category"
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ height: 600 }}>
        {mounted ? (
          <DataGrid
            rows={rows}
            getRowId={(row) => row.id}
            columns={columns}
            rowCount={rowCount}
            loading={loading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            onRowClick={(params) => router.push(`/tickets/${params.id}`)}
            sx={{
              border: "none",
              "& .MuiDataGrid-row": { cursor: "pointer" },
            }}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
