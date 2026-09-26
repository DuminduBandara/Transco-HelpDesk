"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  InputBase,
  Paper,
  Popper,
  ClickAwayListener,
  Typography,
  Stack,
  IconButton,
  CircularProgress,
  Divider,
  MenuItem,
  MenuList,
  ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
import type { Ticket } from "@/types";

export default function GlobalSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: Cmd+K / Ctrl+K or '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is currently typing in an input/textarea/select
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch results as query changes (debounced)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/tickets?search=${encodeURIComponent(trimmed)}&pageSize=6`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.tickets ?? []);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Global search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectTicket = useCallback(
    (ticketId: number) => {
      setOpen(false);
      router.push(`/tickets/${ticketId}`);
    },
    [router]
  );

  const handleViewAllResults = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/tickets?search=${encodeURIComponent(trimmed)}`);
  }, [query, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = query.trim();
      const numericId = trimmed.replace(/^#/, "");
      // If exact ID entered and matches a ticket or pure number, jump to ticket
      if (/^\d+$/.test(numericId)) {
        const idNum = parseInt(numericId, 10);
        const exactMatch = results.find((t) => t.id === idNum);
        if (exactMatch || results.length === 1) {
          handleSelectTicket(exactMatch ? exactMatch.id : results[0].id);
          return;
        }
      }
      handleViewAllResults();
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const numericQuery = query.trim().replace(/^#/, "");
  const isPureNumber = /^\d+$/.test(numericQuery);
  const showDropdown = open && query.trim().length > 0;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={containerRef} sx={{ position: "relative", width: { xs: 200, sm: 300, md: 380 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: isFocused ? "white" : "rgba(255, 255, 255, 0.15)",
            color: isFocused ? "text.primary" : "white",
            borderRadius: 2,
            px: 1.5,
            py: 0.6,
            transition: "all 0.2s ease-in-out",
            border: "1px solid",
            borderColor: isFocused ? "primary.main" : "rgba(255, 255, 255, 0.25)",
            boxShadow: isFocused ? "0 0 0 2px rgba(21, 101, 192, 0.25)" : "none",
            "&:hover": {
              bgcolor: isFocused ? "white" : "rgba(255, 255, 255, 0.25)",
            },
          }}
        >
          <SearchIcon
            sx={{
              mr: 1,
              fontSize: 20,
              color: isFocused ? "primary.main" : "inherit",
              opacity: isFocused ? 1 : 0.85,
            }}
          />

          <InputBase
            inputRef={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              if (query.trim()) setOpen(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets by ID or title..."
            sx={{
              flex: 1,
              fontSize: "0.875rem",
              color: isFocused ? "text.primary" : "white",
              "& input::placeholder": {
                color: isFocused ? "text.secondary" : "rgba(255, 255, 255, 0.75)",
                opacity: 1,
              },
            }}
          />

          {loading && (
            <CircularProgress
              size={16}
              sx={{ color: isFocused ? "primary.main" : "white", mr: 0.5 }}
            />
          )}

          {query && !loading && (
            <IconButton
              size="small"
              onClick={handleClear}
              sx={{
                p: 0.3,
                color: isFocused ? "text.secondary" : "white",
                opacity: 0.8,
                "&:hover": { opacity: 1 },
              }}
            >
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}

          {!query && (
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 0.25,
                bgcolor: isFocused ? "action.hover" : "rgba(255, 255, 255, 0.2)",
                color: isFocused ? "text.secondary" : "rgba(255, 255, 255, 0.85)",
                borderRadius: 1,
                px: 0.75,
                py: 0.2,
                fontSize: "0.7rem",
                fontWeight: 600,
                border: "1px solid",
                borderColor: isFocused ? "divider" : "rgba(255, 255, 255, 0.2)",
              }}
            >
              /
            </Box>
          )}
        </Box>

        {/* Dropdown Results Popper */}
        <Popper
          open={showDropdown}
          anchorEl={containerRef.current}
          placement="bottom-start"
          style={{ width: containerRef.current?.clientWidth || 380, zIndex: 1300 }}
        >
          <Paper
            elevation={4}
            sx={{
              mt: 1,
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              maxHeight: 450,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Direct Jump Option if user typed number or ID */}
            {isPureNumber && (
              <Box
                onClick={() => handleSelectTicket(parseInt(numericQuery, 10))}
                sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: "primary.50",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid",
                  borderColor: "primary.100",
                  "&:hover": { bgcolor: "primary.100" },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <ConfirmationNumberIcon sx={{ fontSize: 18, color: "primary.main" }} />
                  <Typography variant="body2" fontWeight={600} color="primary.main">
                    Jump directly to Ticket #{numericQuery}
                  </Typography>
                </Stack>
                <ArrowForwardIcon sx={{ fontSize: 16, color: "primary.main" }} />
              </Box>
            )}

            {/* Results List */}
            <Box sx={{ overflowY: "auto", flex: 1 }}>
              {loading && results.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Searching tickets...
                  </Typography>
                </Box>
              ) : results.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" fontWeight={500} color="text.primary">
                    No tickets found
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    No tickets match &ldquo;{query}&rdquo;. Try another ID or title keyword.
                  </Typography>
                </Box>
              ) : (
                <MenuList sx={{ p: 0.5 }}>
                  {results.map((ticket) => (
                    <MenuItem
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket.id)}
                      sx={{
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1,
                        my: 0.25,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                          <Box
                            sx={{
                              bgcolor: "primary.50",
                              color: "primary.main",
                              px: 0.75,
                              py: 0.1,
                              borderRadius: 1,
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              border: "1px solid",
                              borderColor: "primary.200",
                            }}
                          >
                            #{ticket.id}
                          </Box>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            sx={{ maxWidth: 220 }}
                          >
                            {ticket.title}
                          </Typography>
                        </Stack>

                        <Typography variant="caption" color="text.secondary" noWrap>
                          {ticket.category_name ? `${ticket.category_name} • ` : ""}
                          {ticket.created_by_name ? `by ${ticket.created_by_name}` : ""}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <StatusChip status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </Stack>
                    </MenuItem>
                  ))}
                </MenuList>
              )}
            </Box>

            {/* Bottom Footer: View all results */}
            <Divider />
            <Box
              onClick={handleViewAllResults}
              sx={{
                px: 2,
                py: 1.25,
                bgcolor: "background.default",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Typography variant="caption" fontWeight={600} color="primary.main">
                View all results for &ldquo;{query.trim()}&rdquo; in Tickets list
              </Typography>
              <ArrowForwardIcon sx={{ fontSize: 14, color: "primary.main" }} />
            </Box>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
