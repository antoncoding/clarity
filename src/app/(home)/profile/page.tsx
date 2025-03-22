"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { BounceLoader } from "react-spinners";
import { Copy, CheckCircle } from "lucide-react";

type UserAccount = {
  available_credits: number;
  lifetime_usage_cost: number;
  referral_code: string;
};

export default function ProfilePage() {
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  // Fetch user account data
  useEffect(() => {
    const fetchUserAccount = async () => {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Fetch user account data
      const { data, error } = await supabase
        .from("user_accounts")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user account:", error);
      } else {
        setUserAccount(data);
      }
      
      setIsLoading(false);
    };
    
    fetchUserAccount();
  }, [supabase]);

  // Handle copying referral link
  const copyReferralLink = () => {
    if (!userAccount) return;
    
    const referralLink = `${window.location.origin}?ref=${userAccount.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <BounceLoader color="#0047AB" size={40} />
      </div>
    );
  }

  if (!userAccount) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400">
            User account information not found. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Usage & Credits</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Available Credits</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {userAccount.available_credits.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Credits available for use
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Lifetime Usage</h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${userAccount.lifetime_usage_cost.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total value of services used
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Referral Program</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Share your referral link with friends and earn credits when they sign up.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}?ref=${userAccount.referral_code}`}
              className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            />
          </div>
          
          <button
            onClick={copyReferralLink}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
          <p className="text-blue-800 dark:text-blue-300">
            <strong>How it works:</strong> When someone signs up using your referral link, 
            both you and your friend will receive bonus credits to use on our platform.
          </p>
        </div>
      </div>
    </div>
  );
} 