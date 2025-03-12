import React from 'react';

export default function FormElementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="form-elements-layout">
      {children}
    </div>
  );
} 