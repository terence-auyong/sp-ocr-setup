import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/inventory-group", "/uom"];

export function middleware(request: NextRequest) {
    const token = request.cookies.get("accessToken")?.value;
    const { pathname } = request.nextUrl;

    // If logged in and trying to access /login → redirect to home
    if (token && pathname === "/login") {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // Check if route is protected
    const isProtected =
        pathname === "/" ||
        protectedPaths.some(p => pathname.startsWith(p));

    if (!isProtected) return NextResponse.next();

    // If logged out and trying to access a protected route → redirect to /login
    if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Exclude static files, images, and api routes from middleware
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/).*)",
    ],
};