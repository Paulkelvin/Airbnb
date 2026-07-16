import { Poppins } from "next/font/google";
import { Metadata } from "next";
import SiteHeader from "./(client-components)/(Header)/SiteHeader";
import ClientCommons from "./ClientCommons";
import "./globals.css";
import "@/styles/index.scss";
import "rc-slider/assets/index.css";
import Footer from "@/components/Footer";
import FooterNav from "@/components/FooterNav";
import AuthSessionProvider from "./AuthSessionProvider";
import { getSiteUrl } from "@/lib/site-url";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Potomac — Property Rentals & Stays",
    template: "%s | Potomac",
  },
  description:
    "Find your next stay or long-term lease on Potomac. Browse short-term rentals and monthly leases from verified hosts.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    siteName: "Potomac",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.className}>
      <body className="bg-white text-base dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
        <AuthSessionProvider>
          <ClientCommons />
          <SiteHeader />
          {children}
          <FooterNav />
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
