import { ReactNode } from "react";

export default function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="min-h-[50vh] grid place-items-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">This page is a placeholder. Continue prompting to fill in this page's contents.</p>
        {children}
      </div>
    </div>
  );
}
