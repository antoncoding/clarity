"use server";
import { z } from "zod";
import { validatedAction } from "../auth/middleware";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import config from "../../config";

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

export const signIn = validatedAction(signInSchema, async (data) => {
  const supabase = await createClient();
  const { email, password } = data;

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid credentials. Please try again." };
  }
  const { data: userData, error: userDataError } = await supabase
    .from("user_data")
    .select("*")
    .eq("user_id", signInData.user?.id)
    .single();

  if (userDataError && userDataError.code === "PGRST116") {
    // No user_data entry found, create one
    const { error: insertError } = await supabase
      .from("user_data")
      .insert({ user_id: signInData.user?.id });
    if (insertError) {
      console.error("Error creating user_data entry:", insertError);
      // Consider how you want to handle this error
    }
  }
  // If sign-in is successful, redirect to dashboard
  redirect("/app");
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const supabase = await createClient();
  const { email, password } = data;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError) {
    return { error: signUpError.message };
  }
  // Check if user_data entry exists and create i
  const { error: insertError } = await supabase
    .from("user_data")
    .insert({ user_id: signUpData?.user?.id });

  if (insertError) {
    console.error("Error creating user_data entry:", insertError);
    // Consider how you want to handle this error
  }
  redirect("/app");
});
export const signInWithMagicLink = validatedAction(
  z.object({
    email: z.string().email(),
    redirect: z.string().optional(),
  }),
  async (data) => {
    const supabase = await createClient();
    const { email } = data;

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // set this to false if you do not want the user to be automatically signed up
          shouldCreateUser: true,
          emailRedirectTo: 'http://localhost:3000',
        },
    });
    if (error) {
      console.error("Error sending magic link:", error);
      return { error: error.message };
    }

    return { success: "Magic link sent to your email." };
  }
);
export const signInWithGoogle = async (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const supabase = await createClient();
  const priceId = formData.get("priceId") as string;
  try {
    const redirectTo = `${config.domainName}/api/auth/callback`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectTo}?priceId=${encodeURIComponent(
          priceId || ""
        )}&redirect=/test`,
      },
    });
    if (signInError) {
      return { error: "Failed to sign in with Google. Please try again." };
    }
  } catch (error) {
    return { error: "Failed to sign in with Google. Please try again." };
  }
};

export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
};

export const basicMagicLink = async (prev: any, formData: any) => {

    const supabase = await createClient();
    console.log(supabase, 'supabase')
    const { data, error } = await supabase.auth.signInWithOtp({
        email: formData.get('email'),
        options: {
          // set this to false if you do not want the user to be automatically signed up
          shouldCreateUser: false,
          emailRedirectTo: 'http://localhost:3000',
        },
      })
}

export const signinWithTheMagicLink = async (prev: any, formData: any) => {
    const supabase = await createClient()
  
    const { data, error } = await supabase.auth.signInWithOtp({
      email: formData.get('email'),
      // options: {
      //   // set this to false if you do not want the user to be automatically signed up
      //   shouldCreateUser: false,
      //   emailRedirectTo: 'https://localhost:3000',
      // },
    })
  
    if (error) {
      console.log('error', error)
  
      return {
        success: null,
        error: error.message,
      }
    }
  
    return {
      success: 'Please check your email',
      error: null,
    }
  }

// Other YTBER

const signInWith = (provider: any) => async () => {
    const supabase = await createClient()
  
    const auth_callback_url = `${process.env.SITE_URL}/auth/callback`
  
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: auth_callback_url,
      },
    })
  
    if (error) {
      console.log(error)
    }
  
   if (data.url) {
    redirect(data.url)
   }
  }
  
  export const signinWithTheGoogle = signInWith('google')

export const signInAnonymously =  async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    console.log(error)
    return {
      success: null,
      error: error.message,
    }
  } else if (data?.user) {
    redirect("/");
    return {
      success: 'Please check your email',
      error: null,
    }
  }


};