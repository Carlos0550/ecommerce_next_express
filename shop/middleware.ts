import { NextRequest, NextResponse } from "next/server";

const ADMIN_PUBLIC_PATHS = ["/admin/auth"];
const USER_PROTECTED_PATHS = ["/account", "/orders"];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth_token")?.value;

  if (pathname.startsWith("/admin")) {
    const isPublicAdminPath = ADMIN_PUBLIC_PATHS.some((p) =>
      pathname.startsWith(p),
    );

    if (isPublicAdminPath) {
      if (token) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/auth";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const isUserProtected = USER_PROTECTED_PATHS.some((p) =>
    pathname.startsWith(p),
  );
  if (isUserProtected) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("from", pathname);
      url.searchParams.set("auth", "required");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/orders/:path*"],
};
