import { prisma } from "@/lib/db";

export const inquiryInclude = {
  listing: { select: { id: true, slug: true, title: true, hostId: true } },
  sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

export async function getInquiriesForHost(hostId: string) {
  return prisma.inquiry.findMany({
    where: { listing: { hostId } },
    include: inquiryInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyInquiries(senderId: string) {
  return prisma.inquiry.findMany({
    where: { senderId },
    include: inquiryInclude,
    orderBy: { createdAt: "desc" },
  });
}
