import React from "react";

export const metadata = {
  title: "Help & FAQ",
};

const PageHelp: React.FC = () => {
  return (
    <div className="nc-PageHelp overflow-hidden">
      <div className="container py-16 lg:py-28">
        <h2 className="text-3xl md:text-4xl font-semibold">Help & FAQ</h2>
        <span className="block mt-3 text-neutral-500 dark:text-neutral-400">
          Answers to common questions about using our platform.
        </span>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10"></div>
        <p className="text-neutral-500 dark:text-neutral-400">
          Help articles and FAQ content coming soon.
        </p>
      </div>
    </div>
  );
};

export default PageHelp;
