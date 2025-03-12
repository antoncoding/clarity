import React from 'react';

export default function FormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="forms-layout">
      {children}
    </div>
  );
} 