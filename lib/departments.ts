import { query } from "@/lib/db";

declare global {
  // eslint-disable-next-line no-var
  var _customDepartments: string[] | undefined;
}

const DEFAULT_DEPARTMENTS = [
  "Tansco Travels",
  "Transco Aviation",
  "Transco Holdings",
  "Transco Cargo",
  "Transco Holidays",
  "IT"
];

// In-memory persistent cache for custom added/removed departments
let customDepartments: string[] =
  globalThis._customDepartments ?? [...DEFAULT_DEPARTMENTS];

if (process.env.NODE_ENV !== "production") {
  globalThis._customDepartments = customDepartments;
}

export async function getDepartments(): Promise<string[]> {
  try {
    // Also include any distinct departments assigned to existing users
    const userDepts = await query<{ department: string | null }>(
      "SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != ''"
    );
    const set = new Set<string>(customDepartments);
    for (const row of userDepts) {
      if (row.department && row.department.trim()) {
        set.add(row.department.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  } catch {
    return [...customDepartments].sort((a, b) => a.localeCompare(b));
  }
}

export function addDepartment(name: string): string[] {
  const trimmed = name.trim();
  if (trimmed && !customDepartments.includes(trimmed)) {
    customDepartments.push(trimmed);
    globalThis._customDepartments = customDepartments;
  }
  return [...customDepartments].sort((a, b) => a.localeCompare(b));
}

export function removeDepartment(name: string): string[] {
  const trimmed = name.trim();
  customDepartments = customDepartments.filter(
    (d) => d.toLowerCase() !== trimmed.toLowerCase()
  );
  globalThis._customDepartments = customDepartments;
  return [...customDepartments].sort((a, b) => a.localeCompare(b));
}
