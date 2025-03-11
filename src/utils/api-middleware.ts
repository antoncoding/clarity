import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Middleware for API routes that handles authentication
 * @param handler The route handler to wrap with authentication
 * @returns A new handler that checks authentication before running the original handler
 */
export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // Create Supabase client - this automatically reads cookies
      const supabase = createClient();
      
      // Get the current user from session
      const { data, error } = await supabase.auth.getUser();
      
      console.log("Auth check result:", error ? "Error" : "Success");
      
      // For development convenience, use a test user ID if no authenticated user is found
      if (error || !data.user) {
        console.log("No authenticated user, using test user ID for development");
        // Using a fixed UUID format test user ID for development
        const testUserId = "00000000-0000-0000-0000-000000000000";
        
        // Check if we're in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(`Using test user ID: ${testUserId}`);
          return handler(req, testUserId);
        } else {
          // In production, require proper authentication
          console.error("Authentication failed:", error?.message || "No user found");
          return NextResponse.json(
            { error: "Unauthorized - Please sign in to use the chat" },
            { status: 401 }
          );
        }
      }
      
      console.log(`User authenticated: ${data.user.id}`);
      
      // Call the original handler with the user ID
      return handler(req, data.user.id);
    } catch (error) {
      console.error("Error in authentication middleware:", error);
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 500 }
      );
    }
  };
}
