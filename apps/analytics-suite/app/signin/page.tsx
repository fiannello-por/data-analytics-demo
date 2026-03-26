import * as React from 'react';

import { GoogleAuthCard } from '@/components/auth/google-auth-card';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-8 sm:px-6 lg:px-8">
      <GoogleAuthCard />
    </main>
  );
}
