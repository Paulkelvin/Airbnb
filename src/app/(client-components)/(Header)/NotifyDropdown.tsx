"use client";

import { Popover, Transition } from "@headlessui/react";
import { FC, Fragment, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BellIcon } from "@heroicons/react/24/outline";
import { TYPE_LABELS, summarizeNotification } from "@/modules/notifications/format";
import type { NotificationType } from "@prisma/client";

interface NotificationItem {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  className?: string;
}

const NotifyDropdown: FC<Props> = ({ className = "" }) => {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/notifications/recent")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <Popover className={`relative flex ${className}`}>
      {({ open }) => (
        <>
          <Popover.Button
            className={` ${
              open ? "" : "text-opacity-90"
            } group self-center w-10 h-10 sm:w-12 sm:h-12 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full inline-flex items-center justify-center text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 relative`}
          >
            {unreadCount > 0 && (
              <span className="w-2 h-2 bg-blue-500 absolute top-2 right-2 rounded-full"></span>
            )}
            <BellIcon className="h-6 w-6" />
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-10 w-screen max-w-xs sm:max-w-sm px-4 top-full -right-28 sm:right-0 sm:px-0">
              <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="relative bg-white dark:bg-neutral-800 p-7">
                  <h3 className="text-xl font-semibold mb-4">Notifications</h3>
                  {!loaded ? (
                    <p className="text-sm text-neutral-400">Loading&hellip;</p>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-neutral-500">No notifications yet.</p>
                  ) : (
                    <div className="space-y-1 -mx-3">
                      {notifications.map((n) => (
                        <Link
                          key={n.id}
                          href="/account-notifications"
                          className="flex flex-col p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200 pr-4">
                            {TYPE_LABELS[n.type]}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                            {summarizeNotification(n.type, n.payload)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          {!n.readAt && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"></span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    href="/account-notifications"
                    className="block mt-5 text-center text-sm font-medium text-primary-600 hover:underline"
                  >
                    See all notifications
                  </Link>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default NotifyDropdown;
