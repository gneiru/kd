import type { DefaultSession } from "@auth/core/types";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@/db";

import { env } from "@/env.mjs";
import { notify } from "./webhooks/slack";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
const trustHost = true;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(db, {
    accountsTable: accounts,
    usersTable: users,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    DiscordProvider({
      clientSecret: env.DISCORD_CLIENT_SECRET,
      clientId: env.DISCORD_CLIENT_ID,
    }),
    GoogleProvider({
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      clientId: env.GOOGLE_CLIENT_ID,
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
  trustHost,
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
    authorized({ request, auth }) {
      return !!auth?.user;
    },
  },
  events: {
    signIn: async ({ isNewUser, user }) => {
      if (isNewUser) {
        notify(`User ${user.name}(${user.email}) has signed up.`);
      }
    },
  },
});
