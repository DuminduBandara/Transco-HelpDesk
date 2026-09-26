"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
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

function TicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";

  const [rows, setRows] = useState<Ticket[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });

  // Keep in sync when URL search parameter changes (e.g. from Global Search Bar in navbar)
  useEffect(() => {
    const q = searchParams.get("search") || "";
    setSearchInput(q);
    setDebouncedSearch(q);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [searchParams]);

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

    const res = await fetch(`/api/tickets?${params.toString()}`);
    const data = await res.json();
    setRows(data.tickets ?? []);
    setRowCount(data.total ?? 0);
    setLoading(false);
  }, [debouncedSearch, status, priority, categoryId, paginationModel]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

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
    {
      field: "id",
      headerName: "ID",
      width: 110,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
          <Typography variant="body2" fontWeight={600} color="primary.main">
            #{params.value}
          </Typography>
        </Box>
      ),
    },
    { field: "title", headerName: "Title", flex: 1, minWidth: 220 },
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
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Tickets
      </Typography>

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
        <DataGrid
          rows={rows}
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
      </Paper>
    </Box>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      }
    >
      <TicketsContent />
    </Suspense>
  );
}

