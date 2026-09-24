import mysql from "mysql2/promise";
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

interface MockDbState {
  users: MockUser[];
  categories: MockCategory[];
  tickets: MockTicket[];
  comments: MockComment[];
  notifications: MockNotification[];
  nextUserId: number;
  nextTicketId: number;
  nextCommentId: number;
  nextNotificationId: number;
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
    tickets: [
      {
        id: 1,
        title: "Dual monitor setup not detected after docking station update",
        description: "Secondary display shows 'No Signal' after firmware update on Dell Thunderbolt dock. Tested with HDMI and DisplayPort cables.",
        internal_notes: "Checked Dell dock firmware release notes; version 1.4.1 broke DisplayPort alternate mode on several Latitude laptops. Reverting or applying patch 1.4.3 is recommended.",
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
        id: 2,
        title: "Request access to Production Logs dashboard",
        description: "Need read-only access to Datadog production log viewer for customer support investigations.",
        internal_notes: "Waiting on security review ticket #SEC-492 before adding employee to Datadog read-only group.",
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
        id: 3,
        title: "VPN client disconnection every 30 minutes",
        description: "Cisco AnyConnect disconnects intermittently on home Wi-Fi with error code 412.",
        internal_notes: "Home Wi-Fi router MTU was set to 1500 causing packet fragmentation; reduced to 1400 on the AnyConnect client XML profile.",
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
        id: 4,
        title: "Printer spooler service hanging on Accounting floor",
        description: "Network printer HP LaserJet 400 is queueing jobs but failing to output pages.",
        internal_notes: "Cleared stuck print job owned by payroll batch and rebooted local print server service.",
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
        id: 5,
        title: "Upgrade RAM on development workstation #14",
        description: "Installed additional 32GB DDR5 memory modules for local virtualization workloads.",
        internal_notes: "Crucial CT2K16G48C40U5 kit verified with MemTest86 for 2 passes.",
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
        ticket_id: 2,
        user_id: 2,
        comment: "I have requested approval from your team lead and will grant permissions once confirmed.",
        created_at: "2026-09-23 13:40:00",
      },
      {
        id: 2,
        ticket_id: 3,
        user_id: 2,
        comment: "MTU size adjustment in adapter settings resolved the packet loss issue.",
        created_at: "2026-09-22 10:00:00",
      },
    ],
    nextUserId: 4,
    nextTicketId: 6,
    nextCommentId: 3,
    nextNotificationId: 4,
    notifications: [
      {
        id: 1,
        ticket_id: 1,
        recipient_email: "admin@company.com",
        recipient_name: "System Admin",
        subject: "[IT Help Desk] New Ticket #1: Dual monitor setup not detected after docking station update",
        type: "ticket_created_admin",
        status: "delivered",
        body_text: "New ticket submitted by John Employee (Operations). Priority: High. Category: Hardware.",
        body_html: "<p>New ticket submitted by John Employee (Operations). Priority: High. Category: Hardware.</p>",
        error_message: null,
        created_at: "2026-09-20 14:30:00",
      },
      {
        id: 2,
        ticket_id: 1,
        recipient_email: "employee@company.com",
        recipient_name: "John Employee",
        subject: "[IT Help Desk] Ticket #1 Received: Dual monitor setup not detected after docking station update",
        type: "ticket_created_employee",
        status: "delivered",
        body_text: "Your ticket has been received and added to our IT support queue.",
        body_html: "<p>Your ticket has been received and added to our IT support queue.</p>",
        error_message: null,
        created_at: "2026-09-20 14:30:05",
      },
      {
        id: 3,
        ticket_id: 4,
        recipient_email: "employee@company.com",
        recipient_name: "John Employee",
        subject: "[IT Help Desk] Issue Resolved: Ticket #4 - Printer spooler service hanging on Accounting floor",
        type: "ticket_resolved",
        status: "delivered",
        body_text: "Great news! Your ticket #4 has been marked as resolved by Sarah Agent.",
        body_html: "<p>Great news! Your ticket #4 has been marked as resolved by Sarah Agent.</p>",
        error_message: null,
        created_at: "2026-08-16 15:30:00",
      },
    ],
  };
}

const mockDb: MockDbState = globalThis._mockDbState ?? getInitialMockState();
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

  // 1. SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1
  if (norm.startsWith("SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?")) {
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
 * Executes a mock mutation against in-memory mock store
 */
function mockExecute(sql: string, params: unknown[] = []): mysql.ResultSetHeader {
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
