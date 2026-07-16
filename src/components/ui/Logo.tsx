import React from "react";
import Link from "next/link";

export interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-24" }) => {
  return (
    <Link
      href="/"
      className={`ttnc-logo inline-block focus:outline-none focus:ring-0 ${className}`}
    >
      <span className="text-xl font-bold text-neutral-900 dark:text-white">
        Potomac
      </span>
    </Link>
  );
};

export default Logo;
