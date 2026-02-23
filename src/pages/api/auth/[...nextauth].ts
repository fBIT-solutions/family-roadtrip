import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { type JWT } from "next-auth/jwt";
import { type Session } from "next-auth";
import { type Account } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      if (account) {
        (token as JWT & { accessToken?: string }).accessToken =
          account.access_token;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }): Promise<Session> {
      (session as Session & { accessToken?: string }).accessToken = (
        token as JWT & { accessToken?: string }
      ).accessToken;
      return session;
    },
  },
};

export default NextAuth(authOptions);
