import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verifica sesión activa (lee la cookie, no hace llamada remota)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ruta pública de verificación de certificados — no requiere auth
  if (pathname.startsWith("/verify")) {
    return response;
  }

  const isAuthRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  // Solo consulta si el superadmin existe en rutas de auth (evita llamadas innecesarias)
  let initialized = true;
  if (isAuthRoute) {
    const { data } = await supabase.rpc("superadmin_exists");
    initialized = !!data;
  }

  // Raíz → redirige según estado
  if (pathname === "/") {
    if (!initialized) return NextResponse.redirect(new URL("/signup", request.url));
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /signup → solo si la app no está inicializada
  if (pathname.startsWith("/signup")) {
    if (initialized) return NextResponse.redirect(new URL("/login", request.url));
    return response;
  }

  // /login → si no hay superadmin va a setup; si ya está logueado va al dashboard
  if (pathname.startsWith("/login")) {
    if (!initialized) return NextResponse.redirect(new URL("/signup", request.url));
    if (user) return NextResponse.redirect(new URL("/dashboard", request.url));
    return response;
  }

  // Rutas protegidas → requieren sesión activa
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
