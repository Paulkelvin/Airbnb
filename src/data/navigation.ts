import { NavItemType } from "@/components/ui/Navigation/NavigationItem";
import ncNanoId from "@/utils/ncNanoId";
import { Route } from "@/routers/types";

export const NAVIGATION_DEMO: NavItemType[] = [
  {
    id: ncNanoId(),
    href: "/",
    name: "Home",
  },
  {
    id: ncNanoId(),
    href: "/listing-stay" as Route,
    name: "Listings",
    type: "dropdown",
    children: [
      { id: ncNanoId(), href: "/listing-stay" as Route, name: "All listings" },
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
    name: "List your property",
  },
  {
    id: ncNanoId(),
    href: "/login" as Route,
    name: "Login",
  },
];
