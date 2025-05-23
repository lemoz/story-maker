import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { prisma } from "@/lib/prisma";
import NextAuth from "next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email) {
          console.log("No email provided");
          return null;
        }

        try {
          // Find or create user
          let user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              subscription: true,
            },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                emailVerified: new Date(),
              },
              include: {
                subscription: true,
              },
            });
          }

          if (!user.email) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            image: user.image || null,
          };
        } catch (error) {
          console.error("Error in authorize:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          ...user,
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture as string | null;

        // Get subscription status
        if (session.user.email) {
          const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { subscription: true },
          });

          if (user?.subscription) {
            const isActive =
              user.subscription.status === "active" &&
              user.subscription.stripeCurrentPeriodEnd > new Date();

            session.user.subscription = {
              status: isActive ? "active" : "inactive",
              plan: user.subscription.plan,
              currentPeriodEnd: user.subscription.stripeCurrentPeriodEnd,
            };
          }
        }
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
