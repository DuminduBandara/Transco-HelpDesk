import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import type { Role, TicketPriority, TicketStatus } from "@/types";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
  // eslint-disable-next-line no-var
  var _mockDbState: MockDbState | undefined;
}

interface MockUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  department: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface MockCategory {
  id: number;
  name: string;
}

interface MockTicket {
  id: number;
  title: string;
  description: string;
  internal_notes?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category_id: number | null;
  created_by: number;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface MockComment {
  id: number;
  ticket_id: number;
  user_id: number;
  comment: string;
  created_at: string;
}

export interface MockNotification {
  id: number;
  ticket_id: number | null;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  type: string;
  status: "delivered" | "simulated" | "failed";
  body_text?: string;
  body_html?: string;
  error_message?: string | null;
  created_at: string;
}

export interface MockPasswordReset {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface MockDbState {
  users: MockUser[];
  categories: MockCategory[];
  tickets: MockTicket[];
  comments: MockComment[];
  notifications: MockNotification[];
  password_resets: MockPasswordReset[];
  nextUserId: number;
  nextTicketId: number;
  nextCommentId: number;
  nextNotificationId: number;
  nextPasswordResetId: number;
}

function getInitialMockState(): MockDbState {
  return {
    users: [
      {
        id: 1,
        name: "System Admin",
        email: "admin@company.com",
        // Password: Admin@123
        password_hash: "$2b$10$CwTycUXWue0Thq9StjUM0uJ8G5x5j8rHl5F0mF6D2h6cxOZ1zH1Cu",
        role: "admin",
        department: "IT",
        is_active: 1,
        created_at: "2026-01-01 09:00:00",
        updated_at: "2026-01-01 09:00:00",
      },
      {
        id: 2,
        name: "Sarah Agent",
        email: "agent@company.com",
        // Password: Admin@123
        password_hash: "$2b$10$CwTycUXWue0Thq9StjUM0uJ8G5x5j8rHl5F0mF6D2h6cxOZ1zH1Cu",
        role: "agent",
        department: "IT Support",
        is_active: 1,
        created_at: "2026-01-02 10:00:00",
        updated_at: "2026-01-02 10:00:00",
      },
      {
        id: 3,
        name: "John Employee",
        email: "employee@company.com",
        // Password: Admin@123
        password_hash: "$2b$10$CwTycUXWue0Thq9StjUM0uJ8G5x5j8rHl5F0mF6D2h6cxOZ1zH1Cu",
        role: "employee",
        department: "Operations",
        is_active: 1,
        created_at: "2026-01-03 11:00:00",
        updated_at: "2026-01-03 11:00:00",
      },
    ],
    categories: [
      { id: 1, name: "Hardware" },
      { id: 2, name: "Software" },
      { id: 3, name: "Network" },
      { id: 4, name: "Access Request" },
      { id: 5, name: "Other" },
    ],
    tickets: [],
    comments: [],
    notifications: [],
    password_resets: [],
    nextUserId: 4,
    nextTicketId: 1,
    nextCommentId: 1,
    nextNotificationId: 1,
    nextPasswordResetId: 1,
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db-store.json");

function loadPersistedState(): MockDbState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.tickets)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("[DB Store] Failed to load persisted state:", err);
  }
  return getInitialMockState();
}

export function persistState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(mockDb, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB Store] Failed to save state:", err);
  }
}

const mockDb: MockDbState = globalThis._mockDbState ?? loadPersistedState();
if (process.env.NODE_ENV !== "production") {
  globalThis._mockDbState = mockDb;
}

function formatDate(date = new Date()) {
  return date.toISOString().replace("T", " ").substring(0, 19);
}

function createPool() {
  if (!process.env.DB_HOST) {
    return null;
  }
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    dateStrings: true,
  });
}

export const pool = globalThis._mysqlPool ?? createPool();
if (process.env.NODE_ENV !== "production" && pool) {
  globalThis._mysqlPool = pool;
}

/**
 * Executes a mock query against in-memory mock store
 */
function mockQuery<T = any>(sql: string, params: unknown[] = []): T[] {
  const norm = sql.trim().replace(/\s+/g, " ");

  // 1. SELECT ... FROM users WHERE email = ?
  if (
    norm.includes("FROM users WHERE email = ?") ||
    norm.includes("FROM users WHERE email = ? LIMIT 1")
  ) {
    const email = String(params[0] ?? "").toLowerCase();
    const user = mockDb.users.find((u) => u.email.toLowerCase() === email);
    return user ? ([{ ...user }] as unknown as T[]) : ([] as T[]);
  }

  // Password reset token lookup
  if (norm.includes("FROM password_resets") && norm.includes("token = ?")) {
    const token = String(params[0] ?? "");
    const reset = mockDb.password_resets.find((r) => r.token === token);
    if (!reset) return [] as T[];
    const user = mockDb.users.find((u) => u.id === reset.user_id);
    return [{
      ...reset,
      user_email: user?.email,
      user_name: user?.name,
    }] as unknown as T[];
  }

  // 2. Categories
  if (norm.startsWith("SELECT id, name FROM categories")) {
    const list = [...mockDb.categories].sort((a, b) => a.name.localeCompare(b.name));
    return list as unknown as T[];
  }

  // 3. Stats: status count
  if (norm.includes("FROM tickets GROUP BY status")) {
    const counts: Record<string, number> = {};
    for (const t of mockDb.tickets) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count })) as unknown as T[];
  }

  // 4. Stats: priority count
  if (norm.includes("FROM tickets GROUP BY priority")) {
    const counts: Record<string, number> = {};
    for (const t of mockDb.tickets) {
      counts[t.priority] = (counts[t.priority] ?? 0) + 1;
    }
    return Object.entries(counts).map(([priority, count]) => ({ priority, count })) as unknown as T[];
  }

  // 5. Stats: unassigned open tickets
  if (norm.includes("FROM tickets WHERE assigned_to IS NULL AND status != 'closed'")) {
    const count = mockDb.tickets.filter((t) => t.assigned_to === null && t.status !== "closed").length;
    return [{ count }] as unknown as T[];
  }

  // 6. Stats: total users
  if (norm.includes("SELECT COUNT(*) AS count FROM users")) {
    return [{ count: mockDb.users.length }] as unknown as T[];
  }

  // 7. Ticket detail: SELECT t.id ... WHERE t.id = ?
  if (norm.startsWith("SELECT t.id, t.title") && norm.includes("WHERE t.id = ?")) {
    const id = Number(params[0]);
    const t = mockDb.tickets.find((item) => item.id === id);
    if (!t) return [] as T[];
    const cat = mockDb.categories.find((c) => c.id === t.category_id);
    const cu = mockDb.users.find((u) => u.id === t.created_by);
    const au = mockDb.users.find((u) => u.id === t.assigned_to);
    return [
      {
        ...t,
        category_name: cat ? cat.name : null,
        created_by_name: cu ? cu.name : "Unknown",
        created_by_email: cu ? cu.email : "",
        assigned_to_name: au ? au.name : null,
      },
    ] as unknown as T[];
  }

  // 7b. Monthly report query: tickets within created_at range
  if (norm.includes("FROM tickets t") && norm.includes("t.created_at >= ? AND t.created_at <= ?")) {
    const start = String(params[0]);
    const end = String(params[1]);
    const list = mockDb.tickets
      .filter((t) => t.created_at >= start && t.created_at <= end)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const rows = list.map((t) => {
      const cat = mockDb.categories.find((c) => c.id === t.category_id);
      const cu = mockDb.users.find((u) => u.id === t.created_by);
      const au = mockDb.users.find((u) => u.id === t.assigned_to);
      return {
        ...t,
        category_name: cat ? cat.name : null,
        created_by_name: cu ? cu.name : "Unknown",
        created_by_email: cu ? cu.email : "",
        assigned_to_name: au ? au.name : "Unassigned",
      };
    });
    return rows as unknown as T[];
  }

  // 8. Tickets list with filters and pagination
  if (norm.startsWith("SELECT t.id, t.title") && norm.includes("FROM tickets t")) {
    let filtered = [...mockDb.tickets];

    // Params order in route: [status?, priority?, category_id?, assigned_to?, pageSize, offset]
    // Or if created_by (employee): [user.id, ...]
    let paramIdx = 0;
    if (norm.includes("t.created_by = ?")) {
      const creatorId = Number(params[paramIdx++]);
      filtered = filtered.filter((t) => t.created_by === creatorId);
    }
    if (norm.includes("(t.title LIKE ? OR t.description LIKE ?)")) {
      const searchPattern = String(params[paramIdx++]);
      paramIdx++; // skip duplicate %search% param for description
      const searchTerm = searchPattern.replace(/^%|%$/g, "").toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchTerm) ||
          t.description.toLowerCase().includes(searchTerm)
      );
    }
    if (norm.includes("t.status = ?")) {
      const statusVal = String(params[paramIdx++]);
      filtered = filtered.filter((t) => t.status === statusVal);
    }
    if (norm.includes("t.priority = ?")) {
      const priVal = String(params[paramIdx++]);
      filtered = filtered.filter((t) => t.priority === priVal);
    }
    if (norm.includes("t.category_id = ?")) {
      const catVal = Number(params[paramIdx++]);
      filtered = filtered.filter((t) => t.category_id === catVal);
    }
    if (norm.includes("t.assigned_to = ?")) {
      const assVal = Number(params[paramIdx++]);
      filtered = filtered.filter((t) => t.assigned_to === assVal);
    }

    const pageSize = Number(params[paramIdx++]) || 25;
    const offset = Number(params[paramIdx++]) || 0;

    const total = filtered.length;
    // Sort descending by created_at
    filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const paged = filtered.slice(offset, offset + pageSize);

    const rows = paged.map((t) => {
      const cat = mockDb.categories.find((c) => c.id === t.category_id);
      const cu = mockDb.users.find((u) => u.id === t.created_by);
      const au = mockDb.users.find((u) => u.id === t.assigned_to);
      return {
        ...t,
        category_name: cat ? cat.name : null,
        created_by_name: cu ? cu.name : "Unknown",
        assigned_to_name: au ? au.name : null,
        total,
      };
    });

    return rows as unknown as T[];
  }

  // 9. SELECT id, created_by FROM tickets WHERE id = ?
  if (norm.includes("FROM tickets WHERE id = ?")) {
    const id = Number(params[0]);
    const t = mockDb.tickets.find((item) => item.id === id);
    return t ? ([{ id: t.id, created_by: t.created_by }] as unknown as T[]) : ([] as T[]);
  }

  // 10. Comments list: SELECT tc.id ... FROM ticket_comments tc
  if (norm.includes("FROM ticket_comments tc")) {
    const ticketId = Number(params[0]);
    const comments = mockDb.comments
      .filter((c) => c.ticket_id === ticketId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => {
        const u = mockDb.users.find((user) => user.id === c.user_id);
        return {
          ...c,
          user_name: u ? u.name : "Unknown",
          user_role: u ? u.role : "employee",
        };
      });
    return comments as unknown as T[];
  }

  // 11. Agents list: SELECT id, name FROM users WHERE role = 'agent' AND is_active = 1
  if (norm.includes("WHERE role = 'agent' AND is_active = 1")) {
    const agents = mockDb.users
      .filter((u) => u.role === "agent" && u.is_active)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => ({ id: u.id, name: u.name }));
    return agents as unknown as T[];
  }

  // 12. Users list for admin
  if (norm.startsWith("SELECT id, name, email, role, department, is_active, created_at FROM users")) {
    let list = [...mockDb.users];
    if (norm.includes("WHERE role = ?")) {
      const roleFilter = String(params[0]);
      list = list.filter((u) => u.role === roleFilter);
    }
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      is_active: Boolean(u.is_active),
      created_at: u.created_at,
    })) as unknown as T[];
  }

  // 13. User lookup by email: SELECT id FROM users WHERE email = ?
  if (norm.includes("FROM users WHERE email = ?")) {
    const email = String(params[0] ?? "").toLowerCase();
    const u = mockDb.users.find((user) => user.email.toLowerCase() === email);
    return u ? ([{ id: u.id }] as unknown as T[]) : ([] as T[]);
  }

  // 14. User lookup by id: SELECT id FROM users WHERE id = ?
  if (norm.includes("FROM users WHERE id = ?")) {
    const id = Number(params[0]);
    const u = mockDb.users.find((user) => user.id === id);
    return u ? ([{ id: u.id }] as unknown as T[]) : ([] as T[]);
  }

  // 15. Admins list: SELECT id, name, email FROM users WHERE role = 'admin' AND is_active = 1
  if (norm.includes("WHERE role = 'admin' AND is_active = 1")) {
    const admins = mockDb.users
      .filter((u) => u.role === "admin" && u.is_active)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => ({ id: u.id, name: u.name, email: u.email }));
    return admins as unknown as T[];
  }

  // 16. Email notifications: SELECT ... FROM email_notifications
  if (norm.includes("FROM email_notifications")) {
    let list = [...mockDb.notifications];
    if (norm.includes("ticket_id = ?")) {
      const tid = Number(params[0]);
      list = list.filter((n) => n.ticket_id === tid);
    } else if (norm.includes("recipient_email = ?")) {
      const email = String(params[0]).toLowerCase();
      list = list.filter((n) => n.recipient_email.toLowerCase() === email);
    }
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list as unknown as T[];
  }

  console.warn("[Mock DB] Unmatched query:", sql, params);
  return [] as T[];
}

/**
 * Executes a mock mutation against persistent store
 */
function runMockExecute(sql: string, params: unknown[] = []): mysql.ResultSetHeader {
  const norm = sql.trim().replace(/\s+/g, " ");
  const now = formatDate();

  // 1. Insert ticket
  if (norm.startsWith("INSERT INTO tickets")) {
    const [title, description, priority, category_id, created_by] = params as [
      string,
      string,
      TicketPriority,
      number | null,
      number
    ];
    const id = mockDb.nextTicketId++;
    mockDb.tickets.unshift({
      id,
      title,
      description,
      priority,
      category_id: category_id ?? null,
      created_by,
      assigned_to: null,
      internal_notes: null,
      status: "open",
      created_at: now,
      updated_at: now,
      resolved_at: null,
    });
    return { insertId: id, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 2. Claim / assign ticket
  if (norm.startsWith("UPDATE tickets SET assigned_to = ?")) {
    const [userId, ticketId] = params as [number, number];
    const ticket = mockDb.tickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.assigned_to = userId;
      if (ticket.status === "open") {
        ticket.status = "in_progress";
      }
      ticket.updated_at = now;
      return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
    }
    return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;
  }

  // 3. Update ticket: UPDATE tickets SET ... WHERE id = ?
  if (norm.startsWith("UPDATE tickets SET")) {
    const ticketId = Number(params[params.length - 1]);
    const ticket = mockDb.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;

    // Parse clauses
    const setPart = norm.substring("UPDATE tickets SET".length, norm.lastIndexOf("WHERE id = ?")).trim();
    const clauses = setPart.split(",").map((s) => s.trim());
    let pIdx = 0;

    for (const clause of clauses) {
      if (clause.startsWith("status = ?")) {
        const val = params[pIdx++] as TicketStatus;
        ticket.status = val;
      } else if (clause.startsWith("priority = ?")) {
        const val = params[pIdx++] as TicketPriority;
        ticket.priority = val;
      } else if (clause.startsWith("title = ?")) {
        const val = params[pIdx++] as string;
        ticket.title = val;
      } else if (clause.startsWith("description = ?")) {
        const val = params[pIdx++] as string;
        ticket.description = val;
      } else if (clause.startsWith("category_id = ?")) {
        const val = params[pIdx++] as number | null;
        ticket.category_id = val;
      } else if (clause.startsWith("assigned_to = ?")) {
        const val = params[pIdx++] as number | null;
        ticket.assigned_to = val;
      } else if (clause.startsWith("internal_notes = ?")) {
        const val = params[pIdx++] as string | null;
        ticket.internal_notes = val ?? null;
      } else if (clause.startsWith("resolved_at = NOW()")) {
        ticket.resolved_at = now;
      } else if (clause.startsWith("resolved_at = NULL")) {
        ticket.resolved_at = null;
      }
    }
    ticket.updated_at = now;
    return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 4. Delete ticket: DELETE FROM tickets WHERE id = ?
  if (norm.startsWith("DELETE FROM tickets WHERE id = ?")) {
    const id = Number(params[0]);
    const idx = mockDb.tickets.findIndex((t) => t.id === id);
    if (idx !== -1) {
      mockDb.tickets.splice(idx, 1);
      mockDb.comments = mockDb.comments.filter((c) => c.ticket_id !== id);
      return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
    }
    return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;
  }

  // 5. Insert comment
  if (norm.startsWith("INSERT INTO ticket_comments")) {
    const [ticketId, userId, comment] = params as [number, number, string];
    const id = mockDb.nextCommentId++;
    mockDb.comments.push({
      id,
      ticket_id: ticketId,
      user_id: userId,
      comment,
      created_at: now,
    });
    return { insertId: id, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 6. Insert user
  if (norm.startsWith("INSERT INTO users")) {
    const [name, email, password_hash, role, department] = params as [
      string,
      string,
      string,
      Role,
      string | null
    ];
    const id = mockDb.nextUserId++;
    mockDb.users.push({
      id,
      name,
      email,
      password_hash,
      role,
      department: department ?? null,
      is_active: 1,
      created_at: now,
      updated_at: now,
    });
    return { insertId: id, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 7. Update user: UPDATE users SET ... WHERE id = ?
  if (norm.startsWith("UPDATE users SET")) {
    const userId = Number(params[params.length - 1]);
    const user = mockDb.users.find((u) => u.id === userId);
    if (!user) return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;

    const setPart = norm.substring("UPDATE users SET".length, norm.lastIndexOf("WHERE id = ?")).trim();
    const clauses = setPart.split(",").map((s) => s.trim());
    let pIdx = 0;

    for (const clause of clauses) {
      if (clause.startsWith("name = ?")) {
        user.name = String(params[pIdx++]);
      } else if (clause.startsWith("role = ?")) {
        user.role = params[pIdx++] as Role;
      } else if (clause.startsWith("department = ?")) {
        user.department = (params[pIdx++] as string | null) ?? null;
      } else if (clause.startsWith("is_active = ?")) {
        user.is_active = Number(params[pIdx++]);
      } else if (clause.startsWith("password_hash = ?")) {
        user.password_hash = String(params[pIdx++]);
      }
    }
    user.updated_at = now;
    return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 8. Insert email notification
  if (norm.startsWith("INSERT INTO email_notifications")) {
    const [
      ticket_id,
      recipient_email,
      recipient_name,
      subject,
      type,
      status,
      body_text,
      body_html,
      error_message,
    ] = params as [
      number | null,
      string,
      string,
      string,
      string,
      "delivered" | "simulated" | "failed",
      string | undefined,
      string | undefined,
      string | null | undefined
    ];
    const id = mockDb.nextNotificationId++;
    mockDb.notifications.unshift({
      id,
      ticket_id: ticket_id ?? null,
      recipient_email: String(recipient_email),
      recipient_name: String(recipient_name),
      subject: String(subject),
      type: String(type),
      status: status || "delivered",
      body_text: body_text ? String(body_text) : undefined,
      body_html: body_html ? String(body_html) : undefined,
      error_message: error_message ? String(error_message) : null,
      created_at: now,
    });
    return { insertId: id, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 9. Password Resets: invalidate existing tokens for user
  if (norm.startsWith("UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL")) {
    const userId = Number(params[0]);
    let affected = 0;
    for (const r of mockDb.password_resets) {
      if (r.user_id === userId && !r.used_at) {
        r.used_at = now;
        affected++;
      }
    }
    return { insertId: 0, affectedRows: affected } as mysql.ResultSetHeader;
  }

  // 10. Password Resets: mark token as used
  if (norm.startsWith("UPDATE password_resets SET used_at = NOW() WHERE token = ?")) {
    const token = String(params[0] ?? "");
    const reset = mockDb.password_resets.find((r) => r.token === token);
    if (reset) {
      reset.used_at = now;
      return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
    }
    return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;
  }

  // 11. Password Resets: insert new token
  if (norm.startsWith("INSERT INTO password_resets")) {
    const [user_id, token, expires_at] = params as [number, string, string];
    const id = mockDb.nextPasswordResetId++;
    mockDb.password_resets.unshift({
      id,
      user_id: Number(user_id),
      token: String(token),
      expires_at: String(expires_at),
      used_at: null,
      created_at: now,
    });
    return { insertId: id, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  console.warn("[Mock DB] Unmatched execute:", sql, params);
  return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;
}

function mockExecute(sql: string, params: unknown[] = []): mysql.ResultSetHeader {
  const result = runMockExecute(sql, params);
  if (result.affectedRows > 0 || result.insertId > 0) {
    persistState();
  }
  return result;
}

/**
 * Thin helper for SELECTs — returns rows typed as T[].
 */
export async function query<T = any>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (pool) {
    try {
      const [rows] = await pool.query(sql, params as any);
      return rows as T[];
    } catch (err) {
      console.warn("[DB] MySQL query failed, falling back to mock:", (err as Error).message);
    }
  }
  return mockQuery<T>(sql, params);
}

/**
 * Thin helper for INSERT/UPDATE/DELETE — returns the ResultSetHeader.
 */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<mysql.ResultSetHeader> {
  if (pool) {
    try {
      const [result] = await pool.execute(sql, params as any);
      return result as mysql.ResultSetHeader;
    } catch (err) {
      console.warn("[DB] MySQL execute failed, falling back to mock:", (err as Error).message);
    }
  }
  return mockExecute(sql, params);
}
