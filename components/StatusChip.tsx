import Chip from "@mui/material/Chip";
import type { TicketStatus } from "@/types";

const CONFIG: Record<TicketStatus, { label: string; color: any }> = {
  open: { label: "Open", color: "info" },
  in_progress: { label: "In Progress", color: "warning" },
  resolved: { label: "Resolved", color: "success" },
  closed: { label: "Closed", color: "default" },
};

export default function StatusChip({ status }: { status: TicketStatus }) {
  const { label, color } = CONFIG[status];
  return <Chip label={label} color={color} size="small" variant="filled" />;
}
