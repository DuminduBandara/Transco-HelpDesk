import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role;
    const mustChangePassword = Boolean(token?.mustChangePassword);

    // If user has a temporary password, force them to /first-login
    if (mustChangePassword) {
      if (pathname !== "/first-login") {
        return NextResponse.redirect(new URL("/first-login", req.url));
      }
      return NextResponse.next();
    }

    // If user already changed their password, prevent accessing /first-login
    if (pathname === "/first-login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Admin-only section
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Just require a logged-in user here; per-route role checks above
      // (and again inside each API route, which is the real enforcement
      // boundary) handle the rest.
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Protect everything under the dashboard route group and the admin section.
// Login page and API auth routes are intentionally excluded.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tickets/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/first-login",
  ],
};
