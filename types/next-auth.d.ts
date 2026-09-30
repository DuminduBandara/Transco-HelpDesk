import { Role } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      mustChangePassword?: boolean;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    role: Role;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    mustChangePassword?: boolean;
  }
}
