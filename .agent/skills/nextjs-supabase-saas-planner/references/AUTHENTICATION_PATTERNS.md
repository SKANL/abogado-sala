# Authentication Patterns for Next.js + Supabase SaaS

## Overview

Complete authentication patterns for modern SaaS applications using Supabase Auth with Next.js 15.

---

## Basic Email/Password Authentication

### Sign Up Flow

```typescript
// actions/auth/signup.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
      },
    },
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: error.message };
  }

  // Create profile
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email!,
      full_name: data.options.data.full_name,
    });
  }

  redirect('/dashboard');
}
```

### Sign In Flow

```typescript
// actions/auth/login.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}
```

---

## OAuth Providers

### Google OAuth

```typescript
// app/(auth)/login/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div>
      <Button onClick={handleGoogleLogin}>
        Continue with Google
      </Button>
    </div>
  );
}
```

### OAuth Callback Handler

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(requestUrl.origin + '/dashboard');
}
```

---

## Magic Link Authentication

### Send Magic Link

```typescript
// actions/auth/magic-link.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function sendMagicLink(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

### Magic Link Component

```typescript
// components/auth/magic-link-form.tsx
'use client';

import { useState } from 'react';
import { sendMagicLink } from '@/actions/auth/magic-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await sendMagicLink(email);

    if (result.success) {
      setSent(true);
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <div>
        <p>Check your email for the magic link!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </Button>
    </form>
  );
}
```

---

## Multi-Factor Authentication (MFA)

### Enable MFA

```typescript
// actions/auth/enable-mfa.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function enrollMFA() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator App',
  });

  if (error) {
    return { error: error.message };
  }

  return {
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    factorId: data.id,
  };
}

export async function verifyMFA(factorId: string, code: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    code,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

### MFA Challenge During Login

```typescript
// actions/auth/mfa-challenge.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function challengeMFA(factorId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (error) {
    return { error: error.message };
  }

  return { challengeId: data.id };
}

export async function verifyMFAChallenge(
  factorId: string,
  challengeId: string,
  code: string
) {
  const supabase = await createClient();

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

---

## Password Reset

### Request Reset

```typescript
// actions/auth/reset-password.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function requestPasswordReset(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

### Reset Password Page

```typescript
// app/(auth)/reset-password/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (!error) {
      router.push('/dashboard');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleReset}>
      <Input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}
```

---

## Session Management

### Get Current User

```typescript
// hooks/use-user.ts
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

### Sign Out

```typescript
// actions/auth/logout.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

---

## Protected Routes

### Server-Side Protection

```typescript
// app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
```

### Client-Side Protection

```typescript
// components/auth/protected-route.tsx
'use client';

import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

---

## Email Verification

### Require Email Verification

```typescript
// app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.email_confirmed_at) {
    redirect('/verify-email');
  }

  return <>{children}</>;
}
```

### Resend Verification Email

```typescript
// actions/auth/resend-verification.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function resendVerificationEmail() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email!,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

---

## Social Profiles Enhancement

### Save OAuth Profile Data

```typescript
// Database trigger to save OAuth data
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## Best Practices

### Security
- ✅ Always use HTTPS in production
- ✅ Implement rate limiting on auth endpoints
- ✅ Use secure, httpOnly cookies for sessions
- ✅ Enable MFA for sensitive accounts
- ✅ Validate email addresses
- ✅ Implement password complexity requirements
- ✅ Use CSRF protection
- ✅ Log authentication events

### User Experience
- ✅ Show clear error messages
- ✅ Provide "Remember me" option
- ✅ Support multiple auth methods
- ✅ Implement social login for convenience
- ✅ Make password reset simple
- ✅ Send confirmation emails
- ✅ Show loading states

### Development
- ✅ Test auth flows thoroughly
- ✅ Handle edge cases (expired tokens, etc.)
- ✅ Implement proper error handling
- ✅ Use TypeScript for type safety
- ✅ Keep auth logic server-side when possible
- ✅ Monitor failed login attempts

---

## Common Patterns

### Organization-Scoped Auth

After login, redirect based on organization:

```typescript
// actions/auth/login.ts
export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    return { error: error.message };
  }

  // Get user's default organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization:organizations(slug)')
    .eq('user_id', (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (membership?.organization) {
    redirect(`/${membership.organization.slug}/dashboard`);
  } else {
    redirect('/onboarding');
  }
}
```

### Invitation Flow

Handle team invitations:

```typescript
// app/invitations/[token]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function InvitationPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = await createClient();

  // Verify invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, organization:organizations(name, slug)')
    .eq('token', params.token)
    .single();

  if (!invitation || invitation.expires_at < new Date().toISOString()) {
    redirect('/invitation-expired');
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Store token and redirect to signup
    redirect(`/signup?invitation=${params.token}`);
  }

  // Accept invitation
  await supabase.from('organization_members').insert({
    organization_id: invitation.organization_id,
    user_id: user.id,
    role: invitation.role,
  });

  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  redirect(`/${invitation.organization.slug}/dashboard`);
}
```

---

## Testing Auth Flows

```typescript
// __tests__/auth/signup.test.ts
import { signup } from '@/actions/auth/signup';

describe('Signup', () => {
  it('creates user and profile', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'SecurePass123!');
    formData.append('full_name', 'Test User');

    const result = await signup(formData);

    expect(result.error).toBeUndefined();
    // Verify user exists in database
  });

  it('rejects weak passwords', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', '123');

    const result = await signup(formData);

    expect(result.error).toBeDefined();
  });
});
```

---

This comprehensive guide covers all major authentication patterns for Next.js + Supabase SaaS applications. Always prioritize security and user experience when implementing authentication flows.
