import * as React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleAuthButton } from '@/app/signin/google-auth-button';

export function GoogleAuthCard() {
  return (
    <Card className="w-full max-w-[420px] rounded-[14px] border border-white/10 bg-[#0b0b0b] py-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
      <CardHeader className="gap-2 px-6 text-center">
        <CardTitle className="text-[28px] font-semibold tracking-[-0.03em] text-white">
          Ligthdash as a Semantic Layer POC
        </CardTitle>
        <CardDescription className="text-[15px] leading-6 text-white/58">
          Sign in or create an account with Google to access the analytics suite.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pt-2">
        <GoogleAuthButton />
      </CardContent>
    </Card>
  );
}
