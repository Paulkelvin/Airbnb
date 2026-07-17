import React, { FC } from "react";
import { FacebookIcon, TwitterIcon, InstagramIcon } from "@/components/ui/MiscIcons";

export interface SocialType {
  name: string;
  icon: string;
  href: string;
}

export interface SocialsListProps {
  className?: string;
  itemClass?: string;
  socials?: SocialType[];
}

const ICONS_BY_NAME: Record<string, FC<React.SVGProps<SVGSVGElement>>> = {
  Facebook: FacebookIcon,
  Twitter: TwitterIcon,
  Instagram: InstagramIcon,
};

// TODO: replace with final Potomac social media URLs
const socialsDemo: SocialType[] = [
  { name: "Facebook", icon: "facebook", href: "#" },
  { name: "Twitter", icon: "twitter", href: "#" },
  { name: "Instagram", icon: "instagram", href: "#" },
];

const SocialsList: FC<SocialsListProps> = ({
  className = "",
  itemClass = "block",
  socials = socialsDemo,
}) => {
  return (
    <nav
      className={`nc-SocialsList flex space-x-2.5 text-neutral-6000 dark:text-neutral-300 ${className}`}
      data-nc-id="SocialsList"
    >
      {socials.map((item, i) => {
        const Icon = ICONS_BY_NAME[item.name];
        const isPlaceholder = !item.href || item.href === "#";

        if (isPlaceholder) {
          return (
            <span
              key={i}
              className={`${itemClass} opacity-40 cursor-default`}
              title={`${item.name} — coming soon`}
            >
              {Icon && <Icon className="w-5 h-5" />}
            </span>
          );
        }

        return (
          <a
            key={i}
            className={`${itemClass}`}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={item.name}
          >
            {Icon && <Icon className="w-5 h-5" />}
          </a>
        );
      })}
    </nav>
  );
};

export default SocialsList;
