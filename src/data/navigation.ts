import { NavItemType } from "@/components/ui/Navigation/NavigationItem";
import ncNanoId from "@/utils/ncNanoId";
import { Route } from "@/routers/types";

export const NAVIGATION_DEMO: NavItemType[] = [
  {
    id: ncNanoId(),
    href: "/explore-the-area" as Route,
    name: "Explore the Area",
  },
  {
    id: ncNanoId(),
    href: "/about" as Route,
    name: "About",
  },
  {
    id: ncNanoId(),
    href: "/blog" as Route,
    name: "Blog",
  },
  {
    id: ncNanoId(),
    href: "/add-listing" as Route,
    name: "List Your Space",
  },
];
