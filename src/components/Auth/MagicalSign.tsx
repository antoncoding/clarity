"use client";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import Link from "next/link";
import React, { useState, useActionState } from "react";
import InputGroup from "../FormElements/InputGroup";
import { Checkbox } from "../FormElements/checkbox";
import { basicMagicLink, signinWithTheMagicLink, signinWithTheGoogle, signInWithMagicLink } from "../../../utils/supabase/actions";
import { ActionState } from "../../../utils/auth/middleware";
import { Spinner } from "@chakra-ui/spinner"
import { set } from "zod";
 

export default function MagicalSignin() {
  const [data, setData] = useState({
    email: process.env.NEXT_PUBLIC_DEMO_USER_MAIL || "",
    password: process.env.NEXT_PUBLIC_DEMO_USER_PASS || "",
    remember: false,
  });

  const [email, setUserEmail ] = useState("");

  const [loading, setLoading] = useState(false);

  const [state, formAction, isPending] = useActionState(signinWithTheMagicLink, {
    error: null,
    success: '',
  })

  const { error, success } = state


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value);
  }

//   if (success) {
//     setUserEmail("");
//   }


  return (
    <> 
    <div>
            
    <h1 className="mb-4 text-2xl font-bold text-dark dark:text-white sm:text-heading-3">
            Hello👋
          </h1>

          <p className="w-full max-w-[375px] mb-4 font-medium text-dark-4 dark:text-dark-6">
          Let's get started!
          </p>
    </div>
    <form action={formAction} >
       
      <InputGroup
        type="email"
        label=""
        className="mb-4 [&_input]:py-[15px]"
        placeholder="Enter your email"
        name="email"
        handleChange={handleEmailChange}
        value={email}
        icon={<EmailIcon />}
      />

      <div >
        <button

          type="submit"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary p-4 font-medium text-white transition hover:bg-opacity-90"
        >
          Sign In with Magic Link 🪄 {isPending && <Spinner size="lg" color="black"/>}
          
        </button>
      </div>
      
      
      {success && ( <div className="mt-5 p-2 text-center bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800">
                Check your email
              </h3>
              <p className="mt-2 text-sm text-green-700">
                We&apos;ve sent you a magic link 🔮
              </p>
            </div>)}
    </form>
  
    </>
  );
}
