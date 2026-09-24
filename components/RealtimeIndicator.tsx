"use client";

import { Box, Chip, Tooltip, IconButton, CircularProgress } from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";

interface RealtimeIndicatorProps {
  isConnected: boolean;
  lastSyncTime?: Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function RealtimeIndicator({
  isConnected,
  lastSyncTime,
  onRefresh,
  isRefreshing = false,
}: RealtimeIndicatorProps) {
  const timeFormatted = lastSyncTime
    ? lastSyncTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Just now";

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      <Tooltip
        title={
          isConnected
            ? `Live data connection active. Last synced at ${timeFormatted}.`
            : "Reconnecting to live data stream..."
        }
      >
        <Chip
          icon={
            isConnected ? (
              <WifiIcon sx={{ fontSize: 16, color: "success.main !important" }} />
            ) : (
              <WifiOffIcon sx={{ fontSize: 16, color: "warning.main !important" }} />
            )
          }
          label={isConnected ? "Real-time Live" : "Connecting..."}
          size="small"
          variant="outlined"
          color={isConnected ? "success" : "default"}
          sx={{
            fontWeight: 600,
            fontSize: "0.75rem",
            height: 26,
            bgcolor: isConnected ? "rgba(46, 125, 50, 0.06)" : "action.hover",
            borderColor: isConnected ? "rgba(46, 125, 50, 0.3)" : "divider",
          }}
        />
      </Tooltip>

      {onRefresh && (
        <Tooltip title="Refresh live data">
          <IconButton
            size="small"
            onClick={onRefresh}
            disabled={isRefreshing}
            sx={{
              p: 0.5,
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
          >
            {isRefreshing ? (
              <CircularProgress size={16} />
            ) : (
              <SyncIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
