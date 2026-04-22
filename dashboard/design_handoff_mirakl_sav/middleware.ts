// middleware.ts — Mirakl SAV
// Protection des routes par rôle (vendeur / marketplace)
// À placer à la racine du projet Next.js 14

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // ── Non connecté → rediriger vers login
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ── Connecté sur /login → rediriger vers accueil
  if (session && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const destination = profile?.role === 'marketplace' ? '/marketplace' : '/';
    return NextResponse.redirect(new URL(destination, req.url));
  }

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const role = profile?.role;

    // ── Marketplace : uniquement /marketplace
    if (role === 'marketplace' && !pathname.startsWith('/marketplace')) {
      return NextResponse.redirect(new URL('/marketplace', req.url));
    }

    // ── Vendeur : pas accès à /marketplace
    if (role === 'vendeur' && pathname.startsWith('/marketplace')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Exclure les fichiers statiques et les routes API internes
    '/((?!_next/static|_next/image|favicon.ico|api/stream).*)',
  ],
};
