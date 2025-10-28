// Replit Auth - useAuth hook
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Treat 401 Unauthorized as "not authenticated" rather than an error
    throwOnError: false,
  });

  // If we get a 401 error, user is simply not authenticated (not an error state)
  const isAuthError = error && /^401:/.test(String(error));

  return {
    user,
    isLoading: isLoading && !isAuthError,
    isAuthenticated: !!user && !isAuthError,
  };
}
