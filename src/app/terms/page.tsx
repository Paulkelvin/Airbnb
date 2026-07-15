import React from "react";

export const metadata = {
  title: "Terms of Service",
};

const PageTerms: React.FC = () => {
  return (
    <div className="nc-PageTerms overflow-hidden">
      <div className="container py-16 lg:py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold">
            Terms of Service
          </h2>
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10"></div>
          <p className="text-neutral-500 dark:text-neutral-400">
            Terms of service content coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageTerms;
