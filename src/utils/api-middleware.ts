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
      const supabase = createClient();
      let user;
      
      // Try to get token from Authorization header first (API standard)
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        console.log('🔑 Using Authorization header token for authentication');
        
        // Verify the JWT token
        const { data, error } = await supabase.auth.getUser(token);
        
        if (error || !data.user) {
          console.log('❌ Invalid token in Authorization header');
          return NextResponse.json(
            { error: "Unauthorized - Invalid token" },
            { status: 401 }
          );
        }
        
        user = data.user;
      } else {
        // Fall back to cookie-based auth if no Authorization header
        console.log('🔑 Using cookie-based authentication');
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data.user) {
          console.log('❌ No authenticated user found');
          return NextResponse.json(
            { error: "Unauthorized - Please sign in to use the chat" },
            { status: 401 }
          );
        }
        
        user = data.user;
      }
      
      console.log(`✅ User authenticated: ${user.id}`);
      
      // Call the original handler with the user ID
      return handler(req, user.id);
    } catch (error) {
      console.error("❌ Error in authentication middleware:", error);
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 500 }
      );
    }
  };
}
