import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // API routes that require auth (POST/PUT/DELETE)
      const protectedApiPaths = ["/api/readings", "/api/settings", "/api/import"];
      const isProtectedApi = protectedApiPaths.some((path) =>
        nextUrl.pathname.startsWith(path)
      );

      // Allow GET requests to readings and settings for guests
      if (isProtectedApi) {
        // We'll handle method-level checks in the route handlers
        return true;
      }

      return true;
    },
  },
  providers: [],
};
