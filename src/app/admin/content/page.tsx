import Link from "next/link";
import {
  DocumentTextIcon,
  DocumentIcon,
  TagIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { AdminPageHeader } from "../AdminUI";
import {
  getAdminPosts,
  getAdminPages,
  getAdminCategories,
  getAdminAuthors,
  getAdminFaqs,
  getAdminAttractions,
} from "@/modules/cms/queries";

export const metadata = { title: "Content" };

export default async function AdminContentOverviewPage() {
  const [posts, pages, categories, authors, faqs, attractions] = await Promise.all([
    getAdminPosts(),
    getAdminPages(),
    getAdminCategories(),
    getAdminAuthors(),
    getAdminFaqs(),
    getAdminAttractions(),
  ]);

  const sections = [
    {
      href: "/admin/content/attractions",
      label: "Explore the Area",
      count: attractions.length,
      icon: MapPinIcon,
      description: "Nearby restaurants, parks, waterfronts, and activities shown to guests.",
    },
    {
      href: "/admin/content/posts",
      label: "Blog Posts",
      count: posts.length,
      icon: DocumentTextIcon,
      description: "Write, edit, and publish blog content.",
    },
    {
      href: "/admin/content/pages",
      label: "Pages",
      count: pages.length,
      icon: DocumentIcon,
      description: "Standalone pages — Terms, Privacy, and any others.",
    },
    {
      href: "/admin/content/about",
      label: "About Page",
      count: null,
      icon: InformationCircleIcon,
      description: "The public /about page — hero, stats, mission, values.",
    },
    {
      href: "/admin/content/faq",
      label: "FAQ",
      count: faqs.length,
      icon: QuestionMarkCircleIcon,
      description: "Questions shown on the Help Centre page.",
    },
    {
      href: "/admin/content/categories-authors",
      label: "Categories & Authors",
      count: categories.length + authors.length,
      icon: TagIcon,
      description: "Blog taxonomy and author profiles.",
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Content"
        description="Edit your website's blog and page content — changes go straight to the live site."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href as never}
            className="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-6000 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <section.icon className="w-5 h-5" />
            </div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{section.label}</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{section.description}</p>
            {section.count !== null && (
              <p className="mt-3 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {section.count}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
