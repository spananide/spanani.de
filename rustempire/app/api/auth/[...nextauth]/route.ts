// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import SteamProvider from "next-auth-steam";
import type { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, {
    providers: [
      SteamProvider(req, {
        clientSecret: process.env.STEAM_SECRET!,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback`,
      }),
    ],
    callbacks: {
      session({ session, token }) {
        if (session.user) {
          (session.user as any).steamId = token.sub;
        }
        return session;
      },
    },
  });
}

export { handler as GET, handler as POST };