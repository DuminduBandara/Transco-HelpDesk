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
  internal_notes?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category_id: number | null;
  category_name?: string | null;
  created_by: number;
  created_by_name?: string;
  created_by_email?: string;
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

export type NotificationType =
  | "ticket_created_admin"
  | "ticket_created_employee"
  | "ticket_resolved"
  | "password_reset"
  | "new_comment"
  | "status_update"
  | "test"
  | (string & {});

export interface PasswordReset {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface EmailNotification {
  id: number;
  ticket_id: number | null;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  type: NotificationType;
  status: "delivered" | "simulated" | "failed";
  body_text?: string;
  body_html?: string;
  error_message?: string | null;
  read?: boolean;
  sent_at?: string;
  preview?: string;
  created_at: string;
}
