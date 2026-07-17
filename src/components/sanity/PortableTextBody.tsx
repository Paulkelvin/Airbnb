"use client";

import { PortableText, type PortableTextComponents } from "@portabletext/react";
import Image from "next/image";
import { urlFor } from "@/lib/sanity/client";

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold mt-8 mb-3 text-neutral-900 dark:text-neutral-100">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold mt-6 mb-2 text-neutral-900 dark:text-neutral-100">
        {children}
      </h4>
    ),
    normal: ({ children }) => (
      <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary-500 pl-4 py-1 my-6 italic text-neutral-500 dark:text-neutral-400">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 space-y-1.5 mb-4 text-neutral-600 dark:text-neutral-300">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 space-y-1.5 mb-4 text-neutral-600 dark:text-neutral-300">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => (
      <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    link: ({ value, children }) => {
      const target = value?.openInNewTab ? "_blank" : undefined;
      const rel = target ? "noopener noreferrer" : undefined;
      return (
        <a
          href={value?.href}
          target={target}
          rel={rel}
          className="text-primary-600 hover:underline"
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      const imageUrl = urlFor(value).width(1200).quality(85).url();
      return (
        <figure className="my-8">
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden">
            <Image
              src={imageUrl}
              alt={value.alt || ""}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
};

export default function PortableTextBody({ value }: { value: any }) {
  return <PortableText value={value} components={components} />;
}
