import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  secret:
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === 'development'
      ? 'analytics-suite-local-dev-secret'
      : undefined),
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'jwt',
  },
};
