import { NavItemType } from "@/components/ui/Navigation/NavigationItem";
import ncNanoId from "@/utils/ncNanoId";
import { Route } from "@/routers/types";

export const NAVIGATION_DEMO: NavItemType[] = [
  {
    id: ncNanoId(),
    href: "/listing-stay" as Route,
    name: "Explore",
    type: "dropdown",
    children: [
      { id: ncNanoId(), href: "/listing-stay" as Route, name: "All stays" },
      {
        id: ncNanoId(),
        href: "/listing-stay-map" as Route,
        name: "Map view",
      },
    ],
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
    href: "/help" as Route,
    name: "Help",
  },
  {
    id: ncNanoId(),
    href: "/add-listing" as Route,
    name: "Become a Host",
  },
];
