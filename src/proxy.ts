import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");
    const isClientRole = token?.role === "client";

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return null;
    }

    if (!isAuth) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isClientRole && !req.nextUrl.pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }

    return null;
  },
  {
    callbacks: {
      authorized: () => true, // We handle redirects in the middleware function above
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
