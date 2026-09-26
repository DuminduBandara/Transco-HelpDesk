import mysql from "mysql2/promise";
import type { Role, TicketPriority, TicketStatus, ActivityType } from "@/types";
import { generateTicketId } from "@/lib/ticketId";

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
  mobile_number: string | null;
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
  id: string;
  title: string;
  description: string;
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
  ticket_id: string;
  user_id: number;
  comment: string;
  created_at: string;
}

interface MockActivity {
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

interface MockDbState {
  users: MockUser[];
  categories: MockCategory[];
  tickets: MockTicket[];
  comments: MockComment[];
  activities: MockActivity[];
  nextUserId: number;
  nextCommentId: number;
}

function getInitialMockState(): MockDbState {
  return {
    users: [
      {
        id: 1,
        name: "System Admin",
        email: "admin@company.com",
        mobile_number: "+1 (555) 234-5678",
        // Password: Admin@123
        password_hash: "$2a$10$BoD201yFwN20cSyVbZern.jSqdCnaGyMJ/vBfNum5xQmzKUlMDGra",
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
        mobile_number: "+1 (555) 345-6789",
        // Password: Admin@123
        password_hash: "$2a$10$BoD201yFwN20cSyVbZern.jSqdCnaGyMJ/vBfNum5xQmzKUlMDGra",
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
        mobile_number: "+1 (555) 456-7890",
        // Password: Admin@123
        password_hash: "$2a$10$BoD201yFwN20cSyVbZern.jSqdCnaGyMJ/vBfNum5xQmzKUlMDGra",
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
    tickets: [
      {
        id: "TK1001",
        title: "Dual monitor setup not detected after docking station update",
        description: "Secondary display shows 'No Signal' after firmware update on Dell Thunderbolt dock. Tested with HDMI and DisplayPort cables.",
        status: "open",
        priority: "high",
        category_id: 1,
        created_by: 3,
        assigned_to: null,
        created_at: "2026-09-22 08:30:00",
        updated_at: "2026-09-22 08:30:00",
        resolved_at: null,
      },
      {
        id: "TK1002",
        title: "Request access to Production Logs dashboard",
        description: "Need read-only access to Datadog production log viewer for customer support investigations.",
        status: "in_progress",
        priority: "medium",
        category_id: 4,
        created_by: 3,
        assigned_to: 2,
        created_at: "2026-09-23 11:15:00",
        updated_at: "2026-09-23 13:40:00",
        resolved_at: null,
      },
      {
        id: "TK1003",
        title: "VPN client disconnection every 30 minutes",
        description: "Cisco AnyConnect disconnects intermittently on home Wi-Fi with error code 412.",
        status: "resolved",
        priority: "urgent",
        category_id: 3,
        created_by: 3,
        assigned_to: 2,
        created_at: "2026-09-21 14:00:00",
        updated_at: "2026-09-22 10:00:00",
        resolved_at: "2026-09-22 10:00:00",
      },
      {
        id: "TK1004",
        title: "Printer spooler service hanging on Accounting floor",
        description: "Network printer HP LaserJet 400 is queueing jobs but failing to output pages.",
        status: "resolved",
        priority: "medium",
        category_id: 1,
        created_by: 3,
        assigned_to: 2,
        created_at: "2026-08-15 09:20:00",
        updated_at: "2026-08-16 15:30:00",
        resolved_at: "2026-08-16 15:30:00",
      },
      {
        id: "TK1005",
        title: "Upgrade RAM on development workstation #14",
        description: "Installed additional 32GB DDR5 memory modules for local virtualization workloads.",
        status: "closed",
        priority: "low",
        category_id: 1,
        created_by: 3,
        assigned_to: 2,
        created_at: "2026-08-18 10:00:00",
        updated_at: "2026-08-20 16:00:00",
        resolved_at: "2026-08-20 16:00:00",
      },
    ],
    comments: [
      {
        id: 1,
        ticket_id: "TK1002",
        user_id: 2,
        comment: "I have requested approval from your team lead and will grant permissions once confirmed.",
        created_at: "2026-09-23 13:40:00",
      },
      {
        id: 2,
        ticket_id: "TK1003",
        user_id: 2,
        comment: "MTU size adjustment in adapter settings resolved the packet loss issue.",
        created_at: "2026-09-22 10:00:00",
      },
    ],
    activities: [
      {
        id: "act-1",
        type: "status_change",
        ticket_id: "TK1003",
        ticket_title: "VPN client disconnection every 30 minutes",
        ticket_status: "resolved",
        ticket_priority: "urgent",
        user_id: 2,
        user_name: "Sarah Agent",
        user_role: "agent",
        details: "Changed status to Resolved",
        created_at: "2026-09-22 10:00:00",
      },
      {
        id: "act-2",
        type: "comment",
        ticket_id: "TK1003",
        ticket_title: "VPN client disconnection every 30 minutes",
        ticket_status: "resolved",
        ticket_priority: "urgent",
        user_id: 2,
        user_name: "Sarah Agent",
        user_role: "agent",
        details: "MTU size adjustment in adapter settings resolved the packet loss issue.",
        created_at: "2026-09-22 10:00:00",
      },
      {
        id: "act-3",
        type: "comment",
        ticket_id: "TK1002",
        ticket_title: "Request access to Production Logs dashboard",
        ticket_status: "in_progress",
        ticket_priority: "medium",
        user_id: 2,
        user_name: "Sarah Agent",
        user_role: "agent",
        details: "I have requested approval from your team lead and will grant permissions once confirmed.",
        created_at: "2026-09-23 13:40:00",
      },
      {
        id: "act-4",
        type: "ticket_assigned",
        ticket_id: "TK1002",
        ticket_title: "Request access to Production Logs dashboard",
        ticket_status: "in_progress",
        ticket_priority: "medium",
        user_id: 2,
        user_name: "Sarah Agent",
        user_role: "agent",
        details: "Assigned ticket to Sarah Agent and set status to In Progress",
        created_at: "2026-09-23 11:30:00",
      },
      {
        id: "act-5",
        type: "ticket_created",
        ticket_id: "TK1002",
        ticket_title: "Request access to Production Logs dashboard",
        ticket_status: "in_progress",
        ticket_priority: "medium",
        user_id: 3,
        user_name: "John Employee",
        user_role: "employee",
        details: "Created ticket with medium priority",
        created_at: "2026-09-23 11:15:00",
      },
      {
        id: "act-6",
        type: "ticket_created",
        ticket_id: "TK1001",
        ticket_title: "Dual monitor setup not detected after docking station update",
        ticket_status: "open",
        ticket_priority: "high",
        user_id: 3,
        user_name: "John Employee",
        user_role: "employee",
        details: "Created ticket with high priority",
        created_at: "2026-09-22 08:30:00",
      },
    ],
    nextUserId: 4,
    nextCommentId: 3,
  };
}

const mockDb: MockDbState = globalThis._mockDbState ?? getInitialMockState();
if (process.env.NODE_ENV !== "production") {
  globalThis._mockDbState = mockDb;
}

function formatDate(date = new Date()) {
  return date.toISOString().replace("T", " ").substring(0, 19);
}

export let lastDbError: string | null = null;
export let isUsingMockFallback: boolean = false;

function createPool() {
  if (!process.env.DB_HOST) {
    lastDbError = "DB_HOST environment variable is not defined";
    isUsingMockFallback = true;
    return null;
  }
  try {
    return mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "helpdesk",
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      dateStrings: true,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  } catch (err) {
    lastDbError = (err as Error).message;
    isUsingMockFallback = true;
    return null;
  }
}

export const pool = globalThis._mysqlPool ?? createPool();
if (process.env.NODE_ENV !== "production" && pool) {
  globalThis._mysqlPool = pool;
}

export async function getDbConnectionStatus() {
  if (!pool) {
    return {
      connected: false,
      isMock: true,
      error: lastDbError || "No MySQL pool initialized (DB_HOST not set)",
      config: {
        host: process.env.DB_HOST || "(not set)",
        port: process.env.DB_PORT || "3306",
        user: process.env.DB_USER || "(not set)",
        database: process.env.DB_NAME || "(not set)",
      },
    };
  }

  try {
    const [rows] = await pool.query("SELECT 1 AS alive");
    lastDbError = null;
    isUsingMockFallback = false;
    return {
      connected: true,
      isMock: false,
      error: null,
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || "3306",
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
      },
    };
  } catch (err) {
    lastDbError = (err as Error).message;
    isUsingMockFallback = true;
    return {
      connected: false,
      isMock: true,
      error: (err as Error).message,
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || "3306",
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
      },
    };
  }
}

/**
 * Executes a mock query against in-memory mock store
 */
function mockQuery<T = any>(sql: string, params: unknown[] = []): T[] {
  const norm = sql.trim().replace(/\s+/g, " ");

  // 1. SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1
  if (
    norm.startsWith("SELECT id, name, email, password_hash, role, is_active FROM users") &&
    (norm.includes("WHERE email = ?") || norm.includes("WHERE LOWER(email) = ?"))
  ) {
    const email = String(params[0] ?? "").toLowerCase();
    const user = mockDb.users.find((u) => u.email.toLowerCase() === email);
    return user ? ([{ ...user }] as unknown as T[]) : ([] as T[]);
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
    const id = String(params[0]).trim();
    const t = mockDb.tickets.find((item) => item.id.toUpperCase() === id.toUpperCase());
    if (!t) return [] as T[];
    const cat = mockDb.categories.find((c) => c.id === t.category_id);
    const cu = mockDb.users.find((u) => u.id === t.created_by);
    const au = mockDb.users.find((u) => u.id === t.assigned_to);
    return [
      {
        ...t,
        category_name: cat ? cat.name : null,
        created_by_name: cu ? cu.name : "Unknown",
        created_by_role: cu ? cu.role : "employee",
        created_by_mobile: cu ? cu.mobile_number : null,
        assigned_to_name: au ? au.name : null,
        assigned_to_role: au ? au.role : null,
        assigned_to_mobile: au ? au.mobile_number : null,
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
    if (
      norm.includes("(t.id = ? OR t.title LIKE ? OR t.description LIKE ?)") ||
      norm.includes("(t.id LIKE ? OR t.title LIKE ? OR t.description LIKE ?)") ||
      norm.includes("(t.title LIKE ? OR t.description LIKE ?)")
    ) {
      let targetId: string | null = null;
      if (norm.includes("t.id = ?") || norm.includes("t.id LIKE ?")) {
        targetId = String(params[paramIdx++]).replace(/^%|%$/g, "").toUpperCase();
      }
      const searchPattern = String(params[paramIdx++]);
      paramIdx++; // skip duplicate %search% param for description
      const searchTerm = searchPattern.replace(/^%|%$/g, "").toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (targetId !== null && (t.id.toUpperCase() === targetId || t.id.toUpperCase().includes(targetId))) ||
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
    const id = String(params[0]).trim();
    const t = mockDb.tickets.find((item) => item.id.toUpperCase() === id.toUpperCase());
    return t ? ([{ id: t.id, created_by: t.created_by }] as unknown as T[]) : ([] as T[]);
  }

  // 10. Comments list: SELECT tc.id ... FROM ticket_comments tc
  if (norm.includes("FROM ticket_comments tc")) {
    const ticketId = String(params[0]).trim();
    const comments = mockDb.comments
      .filter((c) => c.ticket_id.toUpperCase() === ticketId.toUpperCase())
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
  if (norm.startsWith("SELECT id, name, email") && norm.includes("FROM users")) {
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
      mobile_number: u.mobile_number,
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

  // 14. User lookup by id: SELECT ... FROM users WHERE id = ?
  if (norm.includes("FROM users WHERE id = ?")) {
    const id = Number(params[0]);
    const u = mockDb.users.find((user) => user.id === id);
    return u ? ([{ ...u }] as unknown as T[]) : ([] as T[]);
  }

  // 15. Activity feed query
  if (norm.includes("combined_activity") || norm.includes("FROM activities")) {
    let list = [...mockDb.activities];
    if (norm.includes("t.created_by = ?")) {
      const empId = Number(params[0]);
      if (Number.isInteger(empId) && empId > 0) {
        const empTicketIds = new Set(
          mockDb.tickets.filter((t) => t.created_by === empId).map((t) => t.id)
        );
        list = list.filter(
          (a) => empTicketIds.has(a.ticket_id) || a.user_id === empId
        );
      }
    }
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const limit = Number(params[params.length - 1]) || 15;
    return list.slice(0, limit) as unknown as T[];
  }

  console.warn("[Mock DB] Unmatched query:", sql, params);
  return [] as T[];
}

/**
 * Executes a mock mutation against in-memory mock store
 */
function mockExecute(sql: string, params: unknown[] = []): mysql.ResultSetHeader {
  const norm = sql.trim().replace(/\s+/g, " ");
  const now = formatDate();

  // 1. Insert ticket
  if (norm.startsWith("INSERT INTO tickets")) {
    let id: string;
    let title: string;
    let description: string;
    let priority: TicketPriority;
    let category_id: number | null;
    let created_by: number;

    if (norm.includes("(id, title, description, priority, category_id, created_by, status)")) {
      [id, title, description, priority, category_id, created_by] = params as [
        string,
        string,
        string,
        TicketPriority,
        number | null,
        number
      ];
    } else {
      [title, description, priority, category_id, created_by] = params as [
        string,
        string,
        TicketPriority,
        number | null,
        number
      ];
      id = generateTicketId();
    }

    mockDb.tickets.unshift({
      id,
      title,
      description,
      priority,
      category_id: category_id ?? null,
      created_by,
      assigned_to: null,
      status: "open",
      created_at: now,
      updated_at: now,
      resolved_at: null,
    });
    const cu = mockDb.users.find((u) => u.id === created_by);
    mockDb.activities.unshift({
      id: `act-${Date.now()}`,
      type: "ticket_created",
      ticket_id: id,
      ticket_title: title,
      ticket_status: "open",
      ticket_priority: priority,
      user_id: created_by,
      user_name: cu ? cu.name : "Employee",
      user_role: cu ? cu.role : "employee",
      details: `Created new ticket with ${priority} priority`,
      created_at: now,
    });
    return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 2. Claim / assign ticket
  if (norm.startsWith("UPDATE tickets SET assigned_to = ?")) {
    const [userId, ticketId] = params as [number, string | number];
    const ticket = mockDb.tickets.find((t) => t.id.toUpperCase() === String(ticketId).toUpperCase());
    if (ticket) {
      ticket.assigned_to = userId;
      if (ticket.status === "open") {
        ticket.status = "in_progress";
      }
      ticket.updated_at = now;
      const au = mockDb.users.find((u) => u.id === userId);
      mockDb.activities.unshift({
        id: `act-${Date.now()}`,
        type: "ticket_assigned",
        ticket_id: ticket.id,
        ticket_title: ticket.title,
        ticket_status: ticket.status,
        ticket_priority: ticket.priority,
        user_id: userId,
        user_name: au ? au.name : "Agent",
        user_role: au ? au.role : "agent",
        details: `Ticket assigned to ${au ? au.name : "Agent"}`,
        created_at: now,
      });
      return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
    }
    return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;
  }

  // 3. Update ticket: UPDATE tickets SET ... WHERE id = ?
  if (norm.startsWith("UPDATE tickets SET")) {
    const ticketId = String(params[params.length - 1]).trim();
    const ticket = mockDb.tickets.find((t) => t.id.toUpperCase() === ticketId.toUpperCase());
    if (!ticket) return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;

    const oldStatus = ticket.status;

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
      } else if (clause.startsWith("resolved_at = NOW()")) {
        ticket.resolved_at = now;
      } else if (clause.startsWith("resolved_at = NULL")) {
        ticket.resolved_at = null;
      }
    }
    ticket.updated_at = now;

    if (ticket.status !== oldStatus) {
      const u = mockDb.users.find(
        (user) => user.id === (ticket.assigned_to ?? ticket.created_by)
      );
      mockDb.activities.unshift({
        id: `act-${Date.now()}`,
        type: "status_change",
        ticket_id: ticket.id,
        ticket_title: ticket.title,
        ticket_status: ticket.status,
        ticket_priority: ticket.priority,
        user_id: u ? u.id : 1,
        user_name: u ? u.name : "Staff",
        user_role: u ? u.role : "agent",
        details: `Ticket status updated to ${ticket.status.replace("_", " ")}`,
        created_at: now,
      });
    }

    return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 4. Delete ticket: DELETE FROM tickets WHERE id = ?
  if (norm.startsWith("DELETE FROM tickets WHERE id = ?")) {
    const id = String(params[0]).trim();
    const idx = mockDb.tickets.findIndex((t) => t.id.toUpperCase() === id.toUpperCase());
    if (idx !== -1) {
      mockDb.tickets.splice(idx, 1);
      mockDb.comments = mockDb.comments.filter((c) => c.ticket_id.toUpperCase() !== id.toUpperCase());
      return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
    }
    return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;
  }

  // 5. Insert comment
  if (norm.startsWith("INSERT INTO ticket_comments")) {
    const [ticketId, userId, comment] = params as [string | number, number, string];
    const id = mockDb.nextCommentId++;
    const tId = String(ticketId).trim();
    mockDb.comments.push({
      id,
      ticket_id: tId,
      user_id: userId,
      comment,
      created_at: now,
    });
    const t = mockDb.tickets.find((item) => item.id.toUpperCase() === tId.toUpperCase());
    const u = mockDb.users.find((user) => user.id === userId);
    mockDb.activities.unshift({
      id: `act-${Date.now()}`,
      type: "comment",
      ticket_id: tId,
      ticket_title: t ? t.title : `Ticket #${tId}`,
      ticket_status: t ? t.status : undefined,
      ticket_priority: t ? t.priority : undefined,
      user_id: userId,
      user_name: u ? u.name : "User",
      user_role: u ? u.role : "employee",
      details: comment.length > 100 ? `${comment.substring(0, 100)}...` : comment,
      created_at: now,
    });
    return { insertId: id, affectedRows: 1 } as mysql.ResultSetHeader;
  }

  // 6. Insert user
  if (norm.startsWith("INSERT INTO users")) {
    let name: string,
      email: string,
      password_hash: string,
      role: Role,
      department: string | null = null,
      mobile_number: string | null = null;

    if (norm.includes("mobile_number")) {
      [name, email, mobile_number, password_hash, role, department] = params as [
        string,
        string,
        string | null,
        string,
        Role,
        string | null
      ];
    } else {
      [name, email, password_hash, role, department] = params as [
        string,
        string,
        string,
        Role,
        string | null
      ];
    }
    const id = mockDb.nextUserId++;
    mockDb.users.push({
      id,
      name,
      email,
      mobile_number: mobile_number ?? null,
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
      } else if (clause.startsWith("email = ?")) {
        user.email = String(params[pIdx++]);
      } else if (clause.startsWith("mobile_number = ?")) {
        const val = params[pIdx++];
        user.mobile_number = val ? String(val) : null;
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

  // 8. Delete user: DELETE FROM users WHERE id = ?
  if (norm.startsWith("DELETE FROM users WHERE id = ?")) {
    const userId = Number(params[0]);
    const idx = mockDb.users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      mockDb.users.splice(idx, 1);
      // Clean up assigned tickets
      for (const t of mockDb.tickets) {
        if (t.assigned_to === userId) {
          t.assigned_to = null;
        }
      }
      return { insertId: 0, affectedRows: 1 } as mysql.ResultSetHeader;
    }
    return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;
  }

  console.warn("[Mock DB] Unmatched execute:", sql, params);
  return { insertId: 0, affectedRows: 0 } as mysql.ResultSetHeader;
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
      lastDbError = (err as Error).message;
      console.warn("[DB] ⚠️ MySQL query failed, falling back to mock:", (err as Error).message);
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
      lastDbError = (err as Error).message;
      console.error("[DB] ❌ MySQL execute failed, falling back to mock:", (err as Error).message);
    }
  }
  return mockExecute(sql, params);
}
