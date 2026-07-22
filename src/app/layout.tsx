import { Poppins } from "next/font/google";
import { Metadata } from "next";
import SiteHeader from "./(client-components)/(Header)/SiteHeader";
import ClientCommons from "./ClientCommons";
import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";
import "@/styles/index.scss";
import "rc-slider/assets/index.css";
import Footer from "@/components/Footer";
import FooterNav from "@/components/FooterNav";
import AuthSessionProvider from "./AuthSessionProvider";
import SiteChrome from "./SiteChrome";
import { getSiteUrl } from "@/lib/site-url";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Potomac Vista Cottage — River Views Near Leonardtown, MD",
    template: "%s | Potomac",
  },
  description:
    "Book Potomac Vista Cottage, a peaceful cottage with river views near Leonardtown, MD, and explore our guide to the best nearby restaurants, parks, and waterfronts.",
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  })();
` }} />
      </head>
      <body className="bg-white text-base dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200 flex flex-col min-h-screen">
        <AuthSessionProvider>
          <ClientCommons />
          <SiteChrome>
            <SiteHeader />
          </SiteChrome>
          <main className="flex-grow">{children}</main>
          <SiteChrome>
            <FooterNav />
            <Footer />
          </SiteChrome>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
