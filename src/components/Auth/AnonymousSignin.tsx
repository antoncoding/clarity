"use client"

import { signInAnonymously } from "../../../utils/supabase/actions";
import { PiDetectiveFill } from "react-icons/pi";
import { Spinner } from "@chakra-ui/spinner"
import React, { useState, useActionState } from "react";


export default function AnonymousSignin({ text }: { text: string }) {

    const [state, formAction, isPending] = useActionState(signInAnonymously, {
      error: null,
      success: '',
    })
  return (
    <form action={formAction}>
      <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-black p-4 font-medium text-white transition hover:bg-opacity-90" 
      > <PiDetectiveFill size="22px" color="white" />
      {text} Anonymous {isPending && <Spinner size="lg" color="white"/>}
    </button>
    </form>
  );
}


// className="flex w-full items-center justify-center gap-3.5 rounded-lg border border-stroke bg-gray-2 p-[15px] font-medium hover:bg-opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-opacity-50">
     