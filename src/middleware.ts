export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Match all routes except static files and api/auth
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
