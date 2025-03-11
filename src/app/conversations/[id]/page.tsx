import { createClient } from "../../../../utils/supabase/server";
import { redirect } from "next/navigation";
import { ChatContainer } from "@/components/Chat/ChatContainer";

// Page component for a specific conversation
export default async function ConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const session = await supabase.auth.getUser();

  if (!session.data.user) {
    return redirect("/auth/sign-in");
  }

  return (
    <div className="h-full">
      <ChatContainer initialConversationId={params.id} />
    </div>
  );
}
