"use client";
import { EmailIcon } from "@/assets/icons";
import React, { useState, useActionState } from "react";
import InputGroup from "../FormElements/InputGroup";
import { signinWithTheMagicLink } from "../../../utils/supabase/actions";
import { BounceLoader } from "react-spinners"

 
export default function MagicalSignin() {
  
  const [email, setUserEmail ] = useState("");

  const [state, formAction, isPending] = useActionState(signinWithTheMagicLink, {
    error: null,
    success: '',
  })

  const { success } = state

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value);
  }

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
          Sign In with Magic Link 🪄 {isPending && <BounceLoader color="#0047AB" size={24}/>}
          
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
