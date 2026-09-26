"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Paper,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Avatar,
  Button,
} from "@mui/material";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HistoryIcon from "@mui/icons-material/History";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
import type { ActivityItem, ActivityType } from "@/types";

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  onRefresh?: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString.replace(" ", "T"));
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return "Yesterday";
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export default function ActivityFeed({
  activities,
  loading = false,
  onRefresh,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<"all" | ActivityType>("all");

  const filteredActivities = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((item) => item.type === filter);
  }, [activities, filter]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "comment":
        return {
          icon: <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />,
          bg: "#f3e5f5",
          color: "#7b1fa2",
          label: "Comment",
        };
      case "status_change":
        return {
          icon: <SyncAltIcon sx={{ fontSize: 18 }} />,
          bg: "#e3f2fd",
          color: "#1565c0",
          label: "Status Changed",
        };
      case "ticket_assigned":
        return {
          icon: <PersonAddAlt1Icon sx={{ fontSize: 18 }} />,
          bg: "#fff3e0",
          color: "#e65100",
          label: "Assignment",
        };
      case "ticket_created":
      default:
        return {
          icon: <ConfirmationNumberIcon sx={{ fontSize: 18 }} />,
          bg: "#e8f5e9",
          color: "#2e7d32",
          label: "New Ticket",
        };
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "admin":
        return { bg: "#fce4ec", text: "#c2185b" };
      case "agent":
        return { bg: "#e8eaf6", text: "#303f9f" };
      default:
        return { bg: "#f5f5f5", text: "#616161" };
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const counts = useMemo(() => {
    return {
      all: activities.length,
      status_change: activities.filter((a) => a.type === "status_change").length,
      comment: activities.filter((a) => a.type === "comment").length,
      ticket_created: activities.filter((a) => a.type === "ticket_created").length,
    };
  }, [activities]);

  return (
    <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: "primary.50",
              color: "primary.main",
              borderRadius: 2,
              p: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HistoryIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Activity Feed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recent ticket status changes, agent assignments, and customer comments
            </Typography>
          </Box>
        </Box>

        {onRefresh && (
          <Tooltip title="Refresh recent activity">
            <IconButton
              onClick={onRefresh}
              disabled={loading}
              size="small"
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              <RefreshIcon
                sx={{
                  animation: loading ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Filter Chips */}
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2.5, gap: 0.5 }}>
        <Chip
          label={`All (${counts.all})`}
          size="small"
          clickable
          color={filter === "all" ? "primary" : "default"}
          variant={filter === "all" ? "filled" : "outlined"}
          onClick={() => setFilter("all")}
          sx={{ fontWeight: filter === "all" ? 600 : 400 }}
        />
        <Chip
          icon={<SyncAltIcon sx={{ fontSize: 16 }} />}
          label={`Status Changes (${counts.status_change})`}
          size="small"
          clickable
          color={filter === "status_change" ? "primary" : "default"}
          variant={filter === "status_change" ? "filled" : "outlined"}
          onClick={() => setFilter("status_change")}
          sx={{ fontWeight: filter === "status_change" ? 600 : 400 }}
        />
        <Chip
          icon={<ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />}
          label={`Comments (${counts.comment})`}
          size="small"
          clickable
          color={filter === "comment" ? "primary" : "default"}
          variant={filter === "comment" ? "filled" : "outlined"}
          onClick={() => setFilter("comment")}
          sx={{ fontWeight: filter === "comment" ? 600 : 400 }}
        />
        <Chip
          icon={<ConfirmationNumberIcon sx={{ fontSize: 16 }} />}
          label={`New Tickets (${counts.ticket_created})`}
          size="small"
          clickable
          color={filter === "ticket_created" ? "primary" : "default"}
          variant={filter === "ticket_created" ? "filled" : "outlined"}
          onClick={() => setFilter("ticket_created")}
          sx={{ fontWeight: filter === "ticket_created" ? 600 : 400 }}
        />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Activity List */}
      {loading && activities.length === 0 ? (
        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={32} />
        </Box>
      ) : filteredActivities.length === 0 ? (
        <Box sx={{ py: 5, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No activity found for this filter.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {filteredActivities.map((item, idx) => {
            const meta = getActivityIcon(item.type);
            const roleStyle = getRoleBadgeColor(item.user_role);

            return (
              <Box
                key={`${item.id}-${idx}`}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  transition: "all 0.15s ease-in-out",
                  bgcolor: "background.paper",
                  "&:hover": {
                    bgcolor: "action.hover",
                    borderColor: "primary.light",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  },
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  {/* Left: User Avatar + Action Meta */}
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                    <Box sx={{ position: "relative" }}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          bgcolor: meta.bg,
                          color: meta.color,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {getInitials(item.user_name)}
                      </Avatar>
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          bgcolor: meta.color,
                          color: "white",
                          borderRadius: "50%",
                          width: 16,
                          height: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }}
                      >
                        {meta.icon}
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" fontWeight={700}>
                          {item.user_name}
                        </Typography>
                        {item.user_role && (
                          <Chip
                            label={item.user_role}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              textTransform: "capitalize",
                              bgcolor: roleStyle.bg,
                              color: roleStyle.text,
                            }}
                          />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          • {formatRelativeTime(item.created_at)}
                        </Typography>
                      </Stack>

                      {/* Action Headline & Ticket Link */}
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.primary">
                          <span style={{ color: meta.color, fontWeight: 600 }}>
                            {meta.label}:{" "}
                          </span>
                          <Link
                            href={`/tickets/${item.ticket_id}`}
                            style={{
                              textDecoration: "none",
                              color: "#1565c0",
                              fontWeight: 600,
                            }}
                          >
                            #{item.ticket_id} {item.ticket_title}
                          </Link>
                        </Typography>
                      </Box>

                      {/* Comment excerpt or Status description */}
                      {item.type === "comment" ? (
                        <Box
                          sx={{
                            mt: 1,
                            p: 1.25,
                            bgcolor: "rgba(0,0,0,0.02)",
                            borderLeft: "3px solid",
                            borderColor: meta.color,
                            borderRadius: "0 6px 6px 0",
                          }}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontStyle: "italic",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            &ldquo;{item.details}&rdquo;
                          </Typography>
                        </Box>
                      ) : (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          {item.details}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {/* Right side: Status / Priority badges & Quick View Link */}
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}
                  >
                    {item.ticket_status && (
                      <StatusChip status={item.ticket_status} />
                    )}
                    {item.ticket_priority && (
                      <PriorityBadge priority={item.ticket_priority} />
                    )}
                    <Button
                      component={Link}
                      href={`/tickets/${item.ticket_id}`}
                      size="small"
                      variant="outlined"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        py: 0.3,
                        px: 1,
                        ml: 0.5,
                      }}
                    >
                      View
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
