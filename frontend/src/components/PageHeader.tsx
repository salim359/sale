import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { IconBack } from "./Icons";

export default function PageHeader({
  title,
  back,
  logo = true,
  right,
}: {
  title?: string;
  back?: boolean;
  logo?: boolean;
  right?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <header className="page-header">
      <div className="page-header-left">
        {back && (
          <button
            className="icon-btn plain"
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <IconBack />
          </button>
        )}
        {logo && <BrandLogo height={28} />}
        {title ? <h1 className="page-header-title">{title}</h1> : null}
      </div>
      {right}
    </header>
  );
}
