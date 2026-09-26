export type Role = "employee" | "agent" | "admin";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category_id: number | null;
  category_name?: string | null;
  created_by: number;
  created_by_name?: string;
  assigned_to: number | null;
  assigned_to_name?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name?: string;
  user_role?: Role;
  comment: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export type ActivityType =
  | "ticket_created"
  | "status_change"
  | "comment"
  | "ticket_assigned";

export interface ActivityItem {
  id: string | number;
  type: ActivityType;
  ticket_id: number;
  ticket_title: string;
  ticket_status?: TicketStatus;
  ticket_priority?: TicketPriority;
  user_id: number;
  user_name: string;
  user_role?: Role;
  details: string;
  created_at: string;
}
