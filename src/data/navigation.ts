import { NavItemType } from "@/components/ui/Navigation/NavigationItem";
import ncNanoId from "@/utils/ncNanoId";
import { Route } from "@/routers/types";

export const NAVIGATION_DEMO: NavItemType[] = [
  {
    id: ncNanoId(),
    href: "/listing-stay" as Route,
    name: "Explore Stays",
    type: "dropdown",
    children: [
      { id: ncNanoId(), href: "/listing-stay" as Route, name: "All properties" },
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
    href: "/add-listing" as Route,
    name: "List Your Space",
  },
];
