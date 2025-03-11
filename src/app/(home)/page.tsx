import { createClient } from "../../../utils/supabase/server";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/Chat/ChatInterface";

export default async function Home() {
  const supabase = await createClient()
  const session = await supabase.auth.getUser()

  if (!session.data.user) {
    return redirect('/auth/sign-in');
  }

  return (
    <div className="h-full">
      <ChatInterface />
    </div>
  );
}
