import { describe, it, expect, vi } from "vitest";
import { SquareError, type SquareClient } from "square";
import { SquarePaymentProvider } from "../square-provider";
import type { NormalizedPaymentMetadata } from "../provider";

/**
 * Exercises SquarePaymentProvider entirely against a mocked SquareClient
 * (dependency injection, same pattern the old stripe-provider.test.ts
 * used) — no network access, no real credentials. Covers createCharge,
 * refund, and parseWebhookEvent, which only touch the injected client.
 * createPaymentIntent/verifyPaymentIntent additionally read/write a
 * PendingPaymentIntent row via Prisma — left to integration testing rather
 * than mocked here.
 */

function mockSquareClient(overrides: Record<string, unknown> = {}): SquareClient {
  return {
    payments: { create: vi.fn(), get: vi.fn() },
    refunds: { refundPayment: vi.fn() },
    ...overrides,
  } as unknown as SquareClient;
}

const metadata: NormalizedPaymentMetadata = {
  bookingId: "booking-1",
  payerUserId: "guest-1",
  payeeUserId: "host-1",
  paymentType: "CHARGE",
};

describe("SquarePaymentProvider.createCharge", () => {
  it("returns SUCCEEDED and the payment id when Square approves synchronously", async () => {
    const client = mockSquareClient({
      payments: { create: vi.fn().mockResolvedValue({ payment: { id: "sqp_123", status: "COMPLETED" } }) },
    });
    const provider = new SquarePaymentProvider(client, "whsig_test");

    const result = await provider.createCharge(5000, "usd", "guest-1", metadata);

    expect(result).toEqual({ providerTransactionRef: "sqp_123", status: "SUCCEEDED" });
    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMoney: { amount: BigInt(5000), currency: "USD" },
        referenceId: "booking-1",
      }),
    );
  });

  it("maps a PENDING Square status to PENDING", async () => {
    const client = mockSquareClient({
      payments: { create: vi.fn().mockResolvedValue({ payment: { id: "sqp_456", status: "PENDING" } }) },
    });
    const provider = new SquarePaymentProvider(client, "whsig_test");

    const result = await provider.createCharge(5000, "usd", "guest-1", metadata);

    expect(result.status).toBe("PENDING");
  });

  it("returns FAILED when Square responds with errors instead of a payment", async () => {
    const client = mockSquareClient({
      payments: {
        create: vi.fn().mockResolvedValue({
          errors: [{ category: "PAYMENT_METHOD_ERROR", code: "CARD_DECLINED", detail: "Card declined." }],
        }),
      },
    });
    const provider = new SquarePaymentProvider(client, "whsig_test");

    const result = await provider.createCharge(5000, "usd", "guest-1", metadata);

    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toBe("Card declined.");
  });

  it("returns a FAILED result (not a thrown error) when Square rejects the request", async () => {
    const declineError = new SquareError({ message: "Card declined.", statusCode: 402 });
    const client = mockSquareClient({
      payments: { create: vi.fn().mockRejectedValue(declineError) },
    });
    const provider = new SquarePaymentProvider(client, "whsig_test");

    const result = await provider.createCharge(5000, "usd", "guest-1", metadata);

    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toBe("Card declined.");
  });

  it("rejects for an unexpected non-Square error (system fault, not a declined payment)", async () => {
    const client = mockSquareClient({
      payments: { create: vi.fn().mockRejectedValue(new Error("ECONNRESET")) },
    });
    const provider = new SquarePaymentProvider(client, "whsig_test");

    await expect(provider.createCharge(5000, "usd", "guest-1", metadata)).rejects.toThrow("ECONNRESET");
  });

  it("rejects a non-positive amount outright without calling Square", async () => {
    const client = mockSquareClient();
    const provider = new SquarePaymentProvider(client, "whsig_test");

    const result = await provider.createCharge(0, "usd", "guest-1", metadata);

    expect(result.status).toBe("FAILED");
    expect(client.payments.create).not.toHaveBeenCalled();
  });
});

describe("SquarePaymentProvider.refund", () => {
  it("looks up the original payment's amount when none is given, then refunds it in full", async () => {
    const client = mockSquareClient({
      payments: { get: vi.fn().mockResolvedValue({ payment: { amountMoney: { amount: BigInt(5000), currency: "USD" } } }) },
      refunds: {
        refundPayment: vi.fn().mockResolvedValue({ refund: { id: "sqr_1", status: "COMPLETED" } }),
      },
    });
    const provider = new SquarePaymentProvider(client, "whsig_test");

    const result = await provider.refund("sqp_123");

    expect(result).toEqual({ providerTransactionRef: "sqr_1", status: "SUCCEEDED" });
    expect(client.refunds.refundPayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "sqp_123", amountMoney: { amount: BigInt(5000), currency: "USD" } }),
    );
  });

  it("uses the given amount for a partial refund without looking up the original payment", async () => {
    const client = mockSquareClient({
      refunds: {
        refundPayment: vi.fn().mockResolvedValue({ refund: { id: "sqr_2", status: "COMPLETED" } }),
      },
    });
    const provider = new SquarePaymentProvider(client, "whsig_test");

    await provider.refund("sqp_123", 1500);

    expect(client.payments.get).not.toHaveBeenCalled();
    expect(client.refunds.refundPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountMoney: { amount: BigInt(1500), currency: "USD" } }),
    );
  });
});

describe("SquarePaymentProvider.parseWebhookEvent", () => {
  const provider = new SquarePaymentProvider(mockSquareClient(), "whsig_test");

  it("normalizes a completed payment.updated event to charge_succeeded", () => {
    const event = provider.parseWebhookEvent(
      JSON.stringify({
        event_id: "evt_1",
        type: "payment.updated",
        data: { object: { payment: { id: "sqp_1", status: "COMPLETED", amount_money: { amount: 5000 } } } },
      }),
    );
    expect(event).toEqual({
      kind: "charge_succeeded",
      providerEventId: "evt_1",
      providerTransactionRef: "sqp_1",
      amountCents: 5000,
    });
  });

  it("normalizes a failed payment.updated event to charge_failed", () => {
    const event = provider.parseWebhookEvent(
      JSON.stringify({
        event_id: "evt_2",
        type: "payment.updated",
        data: { object: { payment: { id: "sqp_2", status: "FAILED", amount_money: { amount: 5000 } } } },
      }),
    );
    expect(event.kind).toBe("charge_failed");
  });

  it("normalizes a completed refund.updated event to refund_succeeded", () => {
    const event = provider.parseWebhookEvent(
      JSON.stringify({
        event_id: "evt_3",
        type: "refund.updated",
        data: { object: { refund: { id: "sqr_1", status: "COMPLETED", amount_money: { amount: 2000 } } } },
      }),
    );
    expect(event).toEqual({
      kind: "refund_succeeded",
      providerEventId: "evt_3",
      providerTransactionRef: "sqr_1",
      amountCents: 2000,
    });
  });

  it("normalizes a dispute.created event to chargeback_created", () => {
    const event = provider.parseWebhookEvent(
      JSON.stringify({
        event_id: "evt_4",
        type: "dispute.created",
        data: {
          object: {
            dispute: { dispute_id: "disp_1", disputed_payment_id: "sqp_1", amount_money: { amount: 5000 } },
          },
        },
      }),
    );
    expect(event).toEqual({
      kind: "chargeback_created",
      providerEventId: "evt_4",
      providerTransactionRef: "sqp_1",
      disputeRef: "disp_1",
      amountCents: 5000,
    });
  });

  it("falls back to unhandled for an unrecognized event type", () => {
    const event = provider.parseWebhookEvent(JSON.stringify({ event_id: "evt_5", type: "some.other.event" }));
    expect(event).toEqual({ kind: "unhandled", providerEventId: "evt_5", providerEventType: "some.other.event" });
  });
});
