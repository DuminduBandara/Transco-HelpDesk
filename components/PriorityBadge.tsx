import Chip from "@mui/material/Chip";
import type { TicketPriority } from "@/types";

const CONFIG: Record<TicketPriority, { label: string; color: any }> = {
  low: { label: "Low", color: "default" },
  medium: { label: "Medium", color: "info" },
  high: { label: "High", color: "warning" },
  urgent: { label: "Urgent", color: "error" },
};

export default function PriorityBadge({
  priority,
}: {
  priority: TicketPriority;
}) {
  const { label, color } = CONFIG[priority];
  return <Chip label={label} color={color} size="small" variant="outlined" />;
}
