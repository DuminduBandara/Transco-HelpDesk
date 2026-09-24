import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

if (
  process.env.APP_URL &&
  (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost"))
) {
  process.env.NEXTAUTH_URL = process.env.APP_URL;
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
