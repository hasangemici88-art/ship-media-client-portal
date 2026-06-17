import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/Banner.png"
      alt="Ship Media Digital"
      width={1920}
      height={672}
      priority
    />
  );
}
