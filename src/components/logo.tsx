import React from "react";
import Image from "next/image";

type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  if (compact) {
    return (
      <Image
        src="/images/logo/purple-circle.svg"
        width={28}
        height={28}
        alt="News Agent Logo"
        priority
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Image
        src="/images/logo/purple-circle.svg"
        width={28}
        height={28}
        alt="News Agent Logo"
        priority
      />
      <span className="text-sm font-bold text-dark dark:text-white">News Agent</span>
    </div>
  );
}
