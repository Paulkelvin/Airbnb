import React from "react";
import Label from "@/components/Label";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import ButtonPrimary from "@/components/ui/ButtonPrimary";

export const metadata = {
  title: "Contact Us",
};

const PageContact: React.FC = () => {
  return (
    <div className="nc-PageContact overflow-hidden">
      <div className="mb-24 lg:mb-32">
        <h2 className="my-16 sm:my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Contact Us
        </h2>
        <div className="container max-w-7xl mx-auto">
          <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-12">
            <div className="max-w-sm space-y-8">
              <div>
                <h3 className="uppercase font-semibold text-sm dark:text-neutral-200 tracking-wider">
                  Email
                </h3>
                <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
                  support@example.com
                </span>
              </div>
              <div>
                <h3 className="uppercase font-semibold text-sm dark:text-neutral-200 tracking-wider">
                  Phone
                </h3>
                <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
                  000-123-456-7890
                </span>
              </div>
            </div>
            <div>
              <form className="grid grid-cols-1 gap-6" action="#" method="post">
                <label className="block">
                  <Label>Full name</Label>
                  <Input placeholder="Your name" type="text" className="mt-1" />
                </label>
                <label className="block">
                  <Label>Email address</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <Label>Message</Label>
                  <Textarea className="mt-1" rows={6} />
                </label>
                <div>
                  <ButtonPrimary type="submit">Send Message</ButtonPrimary>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageContact;
