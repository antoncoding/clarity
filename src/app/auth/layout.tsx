import "@/css/satoshi.css";
import "@/css/style.css";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import React from 'react';

export const metadata: Metadata = {
  title: {
    template: "%s",
    default: "Clarity",
  },
  description:
    "Read news smartly",
};

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-dark">
      {children}
    </div>
  );
}
