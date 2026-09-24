"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Typography,
  Paper,
  MenuItem,
  TextField,
  Stack,
} from "@mui/material";
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

export default function TicketsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(paginationModel.page + 1),
      pageSize: String(paginationModel.pageSize),
    });
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (categoryId) params.set("category_id", categoryId);

    const res = await fetch(`/api/tickets?${params.toString()}`);
    const data = await res.json();
    setRows(data.tickets ?? []);
    setRowCount(data.total ?? 0);
    setLoading(false);
  }, [status, priority, categoryId, paginationModel]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const columns: GridColDef<Ticket>[] = [
    { field: "id", headerName: "ID", width: 70 },
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
      valueGetter: (params) => params.row.category_name ?? "—",
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
      valueGetter: (params) => params.row.assigned_to_name ?? "Unassigned",
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 160 }}
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
            onChange={(e) => setPriority(e.target.value)}
            sx={{ minWidth: 160 }}
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
            onChange={(e) => setCategoryId(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
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
