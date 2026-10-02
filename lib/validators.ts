import { z } from "zod";

export const ticketStatusEnum = z.enum([
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const roleEnum = z.enum(["employee", "agent", "admin"]);

// ---- Tickets ----

export const createTicketSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().min(10, "Please add more detail (min 10 chars)"),
  priority: ticketPriorityEnum.default("medium"),
  category_id: z.number().int().positive().nullable().optional(),
});

export const updateTicketSchema = z
  .object({
    status: ticketStatusEnum.optional(),
    priority: ticketPriorityEnum.optional(),
    category_id: z.number().int().positive().nullable().optional(),
    assigned_to: z.number().int().positive().nullable().optional(),
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const ticketQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: ticketStatusEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  category_id: z.coerce.number().int().positive().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ---- Users (admin) ----

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  mobile_number: z.string().trim().max(30).nullable().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().min(1, "Role is required"),
  department: z.string().trim().max(120).nullable().optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email("Invalid email address").optional(),
    mobile_number: z.string().trim().max(30).nullable().optional(),
    role: z.string().optional(),
    department: z.string().trim().max(120).nullable().optional(),
    is_active: z.boolean().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
