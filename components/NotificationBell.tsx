"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CommentIcon from "@mui/icons-material/Comment";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import type { EmailNotification } from "@/types";

export default function NotificationBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications/read", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClickItem = (item: EmailNotification) => {
    handleClose();
    router.push(`/tickets/${item.ticket_id}`);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Email Alerts & Notifications">
        <IconButton
          color="inherit"
          onClick={handleOpen}
          aria-label="notifications"
          sx={{ mr: 1.5 }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              maxHeight: 480,
              boxShadow: 4,
              borderRadius: 2,
              overflow: "hidden",
            },
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: "primary.main",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Email Alerts
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "All alerts caught up"}
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={loading}
              onClick={handleMarkAllRead}
              startIcon={<MarkEmailReadIcon sx={{ fontSize: 16 }} />}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                borderColor: "rgba(255,255,255,0.6)",
                color: "white",
              }}
            >
              Mark Read
            </Button>
          )}
        </Box>

        <Divider />

        {loading && notifications.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <NotificationsIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No email notifications yet.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              You will receive email alerts here whenever an agent adds a comment or updates your ticket status.
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 380, overflowY: "auto" }}>
            {notifications.map((item, idx) => (
              <Box key={item.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleClickItem(item)}
                    sx={{
                      alignItems: "flex-start",
                      py: 1.5,
                      px: 2,
                      bgcolor: item.read ? "transparent" : "action.hover",
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                      {item.type === "new_comment" ? (
                        <CommentIcon sx={{ color: "info.main", fontSize: 20 }} />
                      ) : (
                        <SyncAltIcon sx={{ color: "primary.main", fontSize: 20 }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                          <Typography
                            variant="body2"
                            fontWeight={item.read ? 500 : 700}
                            noWrap
                            sx={{ maxWidth: 220 }}
                          >
                            {item.subject.replace(/\[IT Helpdesk\]\s*/, "")}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                            {item.sent_at?.substring(11, 16) || ""}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            variant="caption"
                            color="text.primary"
                            display="block"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: 1.3,
                            }}
                          >
                            {item.preview}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", mt: 0.5, display: "block" }}>
                            Sent to: {item.recipient_email} &bull; {item.sent_at?.substring(0, 10)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
