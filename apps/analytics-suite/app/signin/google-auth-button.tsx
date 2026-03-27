'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';

import { Button } from '@/components/ui/button';

export function GoogleAuthButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full cursor-pointer justify-center gap-3 rounded-[10px] border-white/10 bg-white/[0.03] text-[15px] font-medium text-white hover:bg-white/[0.06] hover:text-white"
      onClick={() => signIn('google', { callbackUrl: '/' })}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21.805 12.23c0-.68-.061-1.334-.174-1.962H12v3.713h5.5a4.705 4.705 0 0 1-2.04 3.088v2.563h3.3c1.932-1.779 3.045-4.4 3.045-7.402Z"
          fill="#4285F4"
        />
        <path
          d="M12 22c2.76 0 5.075-.914 6.767-2.468l-3.3-2.563c-.914.612-2.081.974-3.467.974-2.665 0-4.922-1.799-5.728-4.218H2.86v2.643A9.998 9.998 0 0 0 12 22Z"
          fill="#34A853"
        />
        <path
          d="M6.272 13.725A5.99 5.99 0 0 1 5.952 12c0-.6.109-1.182.32-1.725V7.632H2.86A9.998 9.998 0 0 0 2 12c0 1.61.384 3.134 1.06 4.368l3.212-2.643Z"
          fill="#FBBC05"
        />
        <path
          d="M12 6.056c1.503 0 2.853.517 3.915 1.532l2.936-2.936C17.07 3 14.756 2 12 2 8.14 2 4.79 4.21 2.86 7.632l3.412 2.643c.806-2.419 3.063-4.219 5.728-4.219Z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </Button>
  );
}
