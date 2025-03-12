import React from "react";
import Image from "next/image";

type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  if (compact) {
    return (
      <Image
        src="/images/logo/blue-circle.svg"
        width={24}
        height={24}
        alt="Logo"
        priority
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Image
        src="/images/logo/blue-circle.svg"
        width={24}
        height={24}
        alt="Clarity Logo"
        priority
      />
      <span className="text-sm font-bold text-dark dark:text-white"> Clarity </span>
    </div>
  );
}
