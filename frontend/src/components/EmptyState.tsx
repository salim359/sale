import type { ReactNode } from "react";
import BrandLogo from "./BrandLogo";

export default function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <BrandLogo height={48} className="empty-logo" />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
