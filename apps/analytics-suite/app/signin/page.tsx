import * as React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { GoogleAuthCard } from '@/components/auth/google-auth-card';
import { authOptions } from '@/lib/auth';

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-8 sm:px-6 lg:px-8">
      <GoogleAuthCard />
    </main>
  );
}
