export type Role = string;

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface User {
  id: number;
  name: string;
  email: string;
  mobile_number?: string | null;
  role: Role;
  department: string | null;
  is_active: boolean;
  must_change_password?: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category_id: number | null;
  category_name?: string | null;
  created_by: number;
  created_by_name?: string;
  created_by_role?: Role;
  created_by_mobile?: string | null;
  assigned_to: number | null;
  assigned_to_name?: string | null;
  assigned_to_role?: Role;
  assigned_to_mobile?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface TicketComment {
  id: number;
  ticket_id: string;
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
  ticket_id: string;
  ticket_title: string;
  ticket_status?: TicketStatus;
  ticket_priority?: TicketPriority;
  user_id: number;
  user_name: string;
  user_role?: Role;
  details: string;
  created_at: string;
}

export interface SystemRole {
  id: number;
  name: string;
  description: string | null;
  color_code: string;
  created_at?: string;
}

export interface Department {
  id: number;
  name: string;
}

