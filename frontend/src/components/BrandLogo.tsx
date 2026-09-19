export default function BrandLogo({
  height = 32,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt="sale"
      className={`brand-logo${className ? ` ${className}` : ""}`}
      style={{ ["--logo-height" as string]: `${height}px` }}
    />
  );
}
