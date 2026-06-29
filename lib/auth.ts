import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const match = await bcrypt.compare(credentials.password, user.password);
        if (!match) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (!existing) {
          const created = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name ?? "",
              image: user.image,
            },
          });
          user.id = created.id;
        } else {
          user.id = existing.id;
          await prisma.user.update({
            where: { id: existing.id },
            data: { image: user.image, name: user.name ?? existing.name },
          });
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.id) {
        // A user "has a business" if they own one OR were invited into one
        // (i.e. have a Membership). Invited members must not be forced through
        // the /business-new onboarding flow (see proxy.ts).
        const [biz, membership] = await Promise.all([
          prisma.business.findUnique({
            where: { userId: token.id as string },
            select: { id: true },
          }),
          prisma.membership.findFirst({
            where: { userId: token.id as string },
            select: { id: true },
          }),
        ]);
        token.hasBusiness = !!biz || !!membership;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
