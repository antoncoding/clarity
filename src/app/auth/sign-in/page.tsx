import MagicSignin from "@/components/Auth/MagicSignin";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignIn() {
  return (
    <div className="flex items-center justify-center min-h-screen py-10">
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card w-full max-w-[1200px] mx-auto">
        <div className="flex flex-wrap items-center">
          <div className="w-full xl:w-1/2">
            <div className="w-full p-4 sm:p-12.5 xl:p-15">
              <MagicSignin />
            </div>
          </div>

          <div className="hidden w-full h-full xl:block xl:w-1/2">
            <div className="custom-gradient-1 h-full flex flex-col justify-between overflow-hidden rounded-2xl px-12.5 py-12.5 dark:!bg-dark-2 dark:bg-none">
              <div>
                <Link className="mb-10 inline-block" href="/">
                  <Image
                    className="hidden dark:block"
                    src={"/images/logo/blue-circle.svg"}
                    alt="Logo"
                    height={32}
                    width={32}
                  />
                  <Image
                    className="dark:hidden"
                    src={"/images/logo/blue-circle.svg"}
                    alt="Logo"
                    height={32}
                    width={32}
                  />
                </Link>
                <p className="mb-3 text-xl font-medium text-dark dark:text-white">
                  Sign in to your account
                </p>

                <h1 className="mb-4 text-2xl font-bold text-dark dark:text-white sm:text-heading-3">
                  Welcome Back!
                </h1>

                <p className="w-full max-w-[375px] font-medium text-dark-4 dark:text-dark-6">
                  Please sign in to your account to start using Clarity Deep Search
                </p>
              </div>
              
              <div className="mt-auto">
                {/* Space for potential illustration or additional content */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
