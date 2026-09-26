import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { createTicketSchema, ticketQuerySchema } from "@/lib/validators";
import { generateTicketId } from "@/lib/ticketId";
import type { Ticket } from "@/types";

// GET /api/tickets — list tickets, scoped by role, filterable, paginated.
//   employee -> only their own tickets
//   agent/admin -> all tickets
// Query params: status, priority, category_id, assigned_to, page, pageSize
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ticketQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { search, status, priority, category_id, assigned_to, page, pageSize } =
    parsed.data;

  const where: string[] = [];
  const params: unknown[] = [];

  // Employees are hard-scoped to their own tickets, regardless of query params.
  if (user.role === "employee") {
    where.push("t.created_by = ?");
    params.push(user.id);
  }

  if (search) {
    const cleanSearch = search.trim().replace(/^#/, "");
    where.push("(t.id LIKE ? OR t.title LIKE ? OR t.description LIKE ?)");
    params.push(`%${cleanSearch}%`, `%${cleanSearch}%`, `%${cleanSearch}%`);
  }

  if (status) {
    where.push("t.status = ?");
    params.push(status);
  }
  if (priority) {
    where.push("t.priority = ?");
    params.push(priority);
  }
  if (category_id) {
    where.push("t.category_id = ?");
    params.push(category_id);
  }
  if (assigned_to) {
    where.push("t.assigned_to = ?");
    params.push(assigned_to);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  const rows = await query<Ticket & { total: number }>(
    `SELECT
       t.id, t.title, t.description, t.status, t.priority,
       t.category_id, c.name AS category_name,
       t.created_by, cu.name AS created_by_name,
       t.assigned_to, au.name AS assigned_to_name,
       t.created_at, t.updated_at, t.resolved_at,
       COUNT(*) OVER() AS total
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users cu ON cu.id = t.created_by
     LEFT JOIN users au ON au.id = t.assigned_to
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const total = rows[0]?.total ?? 0;
  const tickets = rows.map(({ total: _t, ...rest }) => rest);

  return NextResponse.json({ tickets, total, page, pageSize });
}

// POST /api/tickets — any authenticated user creates a ticket for themself.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { title, description, priority, category_id } = parsed.data;

  // Auto-generate unique 6-character ticket ID (2 uppercase letters + 4 digits, e.g. TK1001, AB4820)
  let ticketId = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateTicketId();
    const existing = await query<{ id: string }>(
      "SELECT id FROM tickets WHERE id = ? LIMIT 1",
      [candidate]
    );
    if (!existing || existing.length === 0) {
      ticketId = candidate;
      break;
    }
  }
  if (!ticketId) {
    ticketId = generateTicketId();
  }

  await execute(
    `INSERT INTO tickets (id, title, description, priority, category_id, created_by, status)
     VALUES (?, ?, ?, ?, ?, ?, 'open')`,
    [ticketId, title, description, priority, category_id ?? null, user.id]
  );

  return NextResponse.json({ id: ticketId }, { status: 201 });
}
