import React, { FC } from "react";
import MainNav1 from "./MainNav1";

export interface HeaderProps {
  navType?: "MainNav1";
  className?: string;
}

const Header: FC<HeaderProps> = ({ className = "" }) => {
  return (
    <div className={`nc-Header sticky top-0 z-40 w-full nc-header-bg ${className}`}>
      <MainNav1 />
    </div>
  );
};

export default Header;
