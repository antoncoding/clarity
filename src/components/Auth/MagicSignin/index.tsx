import Link from "next/link";
import GoogleSigninButton from "../GoogleSigninButton";
import AnonymousSignin from "../AnonymousSignin";
import SigninWithPassword from "../SigninWithPassword";
import MagicalSignin from "../MagicalSign";

export default function MagicSignin() {
  return (
    <>
     
      <div>
        <MagicalSignin />
      </div>

      <div className="my-6 flex items-center justify-center">
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
        <div className="block w-full min-w-fit bg-white px-3 text-center font-medium dark:bg-gray-dark">
          OR
        </div>
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
      </div>

      <GoogleSigninButton text="Sign in" />
      <div style={{marginTop: "20px"}}>
      <AnonymousSignin text="Stay" />
      </div>
      

      

      {/* <div className="mt-6 text-center">
        <p>
          Don’t have any account?{" "}
          <Link href="/auth/sign-up" className="text-primary">
            Sign Up
          </Link>
        </p>
      </div> */}
    </>
  );
}
