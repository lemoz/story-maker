import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscription?: {
        status: string;
        plan: string | null;
        currentPeriodEnd: Date | null;
      };
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    hashedPassword?: string | null;
  }
}
