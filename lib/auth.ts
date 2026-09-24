import { AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import type { Role, User } from "@/types";

interface DbUserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_active: number;
}

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rows = await query<DbUserRow>(
          "SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1",
          [credentials.email]
        );
        const user = rows[0];
        if (!user || !user.is_active) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );
        if (!valid) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "it-helpdesk-jwt-secret-key-32chars-min-ai-studio",
};

/**
 * Server-side helper: get the current session's user, or null.
 * Use in API routes and Server Components.
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: Number((session.user as any).id),
    name: session.user.name!,
    email: session.user.email!,
    role: (session.user as any).role as Role,
  };
}

/**
 * Throws-free RBAC check helper for API routes.
 * Usage: if (!hasRole(user, ["agent", "admin"])) return 403
 */
export function hasRole(
  user: { role: Role } | null,
  allowed: Role[]
): boolean {
  return !!user && allowed.includes(user.role);
}
