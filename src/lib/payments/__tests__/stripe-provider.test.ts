import { describe, it, expect, vi } from "vitest";
import Stripe from "stripe";
import { StripeConnectProvider } from "../stripe-provider";
import type { NormalizedPaymentMetadata } from "../provider";

/**
 * Exercises StripeConnectProvider entirely against a mocked Stripe client
 * (dependency injection) — no network access, no real credentials. This is
 * the verification path for the whole adapter until real Stripe test-mode
 * credentials exist (see docs/setup/environment-variables.md).
 */

function mockStripe(overrides: Record<string, unknown> = {}): Stripe {
  return {
    paymentIntents: { create: vi.fn() },
    refunds: { create: vi.fn() },
    accounts: { create: vi.fn(), retrieve: vi.fn() },
    accountLinks: { create: vi.fn() },
    transfers: { create: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
    ...overrides,
  } as unknown as Stripe;
}

const metadata: NormalizedPaymentMetadata = {
  bookingId: "booking-1",
  payerUserId: "guest-1",
  payeeUserId: "host-1",
  paymentType: "CHARGE",
};

describe("StripeConnectProvider.createCharge", () => {
  it("returns SUCCEEDED and the PaymentIntent id when Stripe confirms synchronously", async () => {
    const stripe = mockStripe({
      paymentIntents: {
        create: vi.fn().mockResolvedValue({ id: "pi_123", status: "succeeded" }),
      },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.createCharge(5000, "usd", "guest-1", metadata);

    expect(result).toEqual({ providerTransactionRef: "pi_123", status: "SUCCEEDED" });
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: "usd",
        confirm: true,
        metadata: expect.objectContaining({ bookingId: "booking-1", paymentType: "CHARGE" }),
      }),
    );
  });

  it("maps requires_action to PENDING", async () => {
    const stripe = mockStripe({
      paymentIntents: {
        create: vi.fn().mockResolvedValue({ id: "pi_456", status: "requires_action" }),
      },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.createCharge(5000, "usd", "guest-1", metadata);

    expect(result.status).toBe("PENDING");
  });

  it("maps requires_payment_method to FAILED", async () => {
    const stripe = mockStripe({
      paymentIntents: {
        create: vi.fn().mockResolvedValue({ id: "pi_789", status: "requires_payment_method" }),
      },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.createCharge(5000, "usd", "guest-1", metadata);

    expect(result.status).toBe("FAILED");
  });

  it("returns a FAILED result (not a thrown error) when the card is declined", async () => {
    const declineError = new Stripe.errors.StripeCardError({
      message: "Your card was declined.",
      type: "card_error",
      code: "card_declined",
    } as never);
    const stripe = mockStripe({
      paymentIntents: { create: vi.fn().mockRejectedValue(declineError) },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.createCharge(5000, "usd", "guest-1", metadata);

    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toBe("Your card was declined.");
  });

  it("rejects for an unexpected non-Stripe error (system fault, not a declined payment)", async () => {
    const stripe = mockStripe({
      paymentIntents: { create: vi.fn().mockRejectedValue(new Error("ECONNRESET")) },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    await expect(provider.createCharge(5000, "usd", "guest-1", metadata)).rejects.toThrow(
      "ECONNRESET",
    );
  });

  it("short-circuits on non-positive amounts without calling Stripe", async () => {
    const stripe = mockStripe();
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.createCharge(0, "usd", "guest-1", metadata);

    expect(result.status).toBe("FAILED");
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe("StripeConnectProvider.refund", () => {
  it("maps a succeeded refund", async () => {
    const stripe = mockStripe({
      refunds: { create: vi.fn().mockResolvedValue({ id: "re_1", status: "succeeded" }) },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.refund("pi_123", 2500);

    expect(result).toEqual({ providerTransactionRef: "re_1", status: "SUCCEEDED" });
    expect(stripe.refunds.create).toHaveBeenCalledWith({
      payment_intent: "pi_123",
      amount: 2500,
    });
  });

  it("maps a pending refund", async () => {
    const stripe = mockStripe({
      refunds: { create: vi.fn().mockResolvedValue({ id: "re_2", status: "pending" }) },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.refund("pi_123");

    expect(result.status).toBe("PENDING");
  });
});

describe("StripeConnectProvider host onboarding", () => {
  it("createPayeeAccount creates an Express account with card_payments + transfers capabilities", async () => {
    const createAccount = vi.fn().mockResolvedValue({ id: "acct_123" });
    const stripe = mockStripe({ accounts: { create: createAccount, retrieve: vi.fn() } });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const ref = await provider.createPayeeAccount({ id: "host-1", email: "host@example.com" });

    expect(ref).toBe("acct_123");
    expect(createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "express",
        email: "host@example.com",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      }),
    );
  });

  it("createOnboardingLink returns the Stripe-hosted URL", async () => {
    const createLink = vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/setup/abc" });
    const stripe = mockStripe({ accountLinks: { create: createLink } });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const url = await provider.createOnboardingLink(
      "acct_123",
      "https://app.example.com/refresh",
      "https://app.example.com/return",
    );

    expect(url).toBe("https://connect.stripe.com/setup/abc");
    expect(createLink).toHaveBeenCalledWith({
      account: "acct_123",
      refresh_url: "https://app.example.com/refresh",
      return_url: "https://app.example.com/return",
      type: "account_onboarding",
    });
  });

  it("getAccountStatus maps charges_enabled/payouts_enabled/details_submitted, defaulting null to false", async () => {
    const stripe = mockStripe({
      accounts: {
        create: vi.fn(),
        retrieve: vi.fn().mockResolvedValue({
          id: "acct_123",
          charges_enabled: true,
          payouts_enabled: false,
          details_submitted: null,
        }),
      },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const status = await provider.getAccountStatus("acct_123");

    expect(status).toEqual({
      chargesEnabled: true,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  });
});

describe("StripeConnectProvider.payout", () => {
  it("creates a Transfer to the connected account (separate charges and transfers, ADR-005)", async () => {
    const createTransfer = vi.fn().mockResolvedValue({ id: "tr_1" });
    const stripe = mockStripe({ transfers: { create: createTransfer } });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.payout("acct_123", 10000, "usd");

    expect(result).toEqual({ providerTransactionRef: "tr_1", status: "SUCCEEDED" });
    expect(createTransfer).toHaveBeenCalledWith({
      amount: 10000,
      currency: "usd",
      destination: "acct_123",
    });
  });

  it("returns FAILED (not a thrown error) when the platform balance is insufficient", async () => {
    const insufficientBalanceError = new Stripe.errors.StripeInvalidRequestError({
      message: "Insufficient funds in your Stripe balance.",
      type: "invalid_request_error",
    } as never);
    const stripe = mockStripe({
      transfers: { create: vi.fn().mockRejectedValue(insufficientBalanceError) },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    const result = await provider.payout("acct_123", 10000, "usd");

    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("Insufficient funds");
  });
});

describe("StripeConnectProvider webhook signature verification", () => {
  it("returns true when Stripe's constructEvent succeeds", () => {
    const stripe = mockStripe({
      webhooks: { constructEvent: vi.fn().mockReturnValue({}) },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    expect(provider.verifyWebhookSignature("{}", "t=1,v1=abc")).toBe(true);
  });

  it("returns false when Stripe's constructEvent throws (tampered payload or wrong secret)", () => {
    const stripe = mockStripe({
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error("No signatures found matching the expected signature");
        }),
      },
    });
    const provider = new StripeConnectProvider(stripe, "whsec_test");

    expect(provider.verifyWebhookSignature("{}", "t=1,v1=bad")).toBe(false);
  });

  it("actually verifies a real Stripe-generated test signature end-to-end (no network call)", () => {
    const realStripe = new Stripe("sk_test_fake_key_for_local_hmac_only");
    const provider = new StripeConnectProvider(realStripe, "whsec_test_secret");
    const payload = JSON.stringify({ id: "evt_1", type: "payment_intent.succeeded" });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_test_secret",
    });

    expect(provider.verifyWebhookSignature(payload, header)).toBe(true);
    expect(provider.verifyWebhookSignature(payload, "t=1,v1=tampered")).toBe(false);
  });
});

describe("StripeConnectProvider.parseWebhookEvent", () => {
  const provider = new StripeConnectProvider(mockStripe(), "whsec_test");

  function stripeEvent(id: string, type: string, object: Record<string, unknown>) {
    return JSON.stringify({ id, type, data: { object } });
  }

  it("normalizes payment_intent.succeeded", () => {
    const event = provider.parseWebhookEvent(
      stripeEvent("evt_1", "payment_intent.succeeded", {
        id: "pi_1",
        amount: 5000,
        amount_received: 5000,
      }),
    );
    expect(event).toEqual({
      kind: "charge_succeeded",
      providerEventId: "evt_1",
      providerTransactionRef: "pi_1",
      amountCents: 5000,
    });
  });

  it("normalizes payment_intent.payment_failed with the decline reason", () => {
    const event = provider.parseWebhookEvent(
      stripeEvent("evt_2", "payment_intent.payment_failed", {
        id: "pi_2",
        amount: 5000,
        last_payment_error: { message: "Your card has insufficient funds." },
      }),
    );
    expect(event).toEqual({
      kind: "charge_failed",
      providerEventId: "evt_2",
      providerTransactionRef: "pi_2",
      amountCents: 5000,
      failureReason: "Your card has insufficient funds.",
    });
  });

  it("normalizes a succeeded refund.updated", () => {
    const event = provider.parseWebhookEvent(
      stripeEvent("evt_3", "refund.updated", { id: "re_1", status: "succeeded", amount: 2500 }),
    );
    expect(event).toEqual({
      kind: "refund_succeeded",
      providerEventId: "evt_3",
      providerTransactionRef: "re_1",
      amountCents: 2500,
    });
  });

  it("treats a non-succeeded refund.updated as unhandled", () => {
    const event = provider.parseWebhookEvent(
      stripeEvent("evt_4", "refund.updated", { id: "re_2", status: "pending", amount: 2500 }),
    );
    expect(event).toEqual({
      kind: "unhandled",
      providerEventId: "evt_4",
      providerEventType: "refund.updated",
    });
  });

  it("normalizes charge.dispute.created, resolving payment_intent whether it's a string or expanded object", () => {
    const asString = provider.parseWebhookEvent(
      stripeEvent("evt_5", "charge.dispute.created", {
        id: "dp_1",
        payment_intent: "pi_5",
        amount: 5000,
      }),
    );
    expect(asString).toEqual({
      kind: "chargeback_created",
      providerEventId: "evt_5",
      providerTransactionRef: "pi_5",
      disputeRef: "dp_1",
      amountCents: 5000,
    });

    const asObject = provider.parseWebhookEvent(
      stripeEvent("evt_6", "charge.dispute.created", {
        id: "dp_2",
        payment_intent: { id: "pi_6" },
        amount: 5000,
      }),
    );
    expect(asObject).toMatchObject({ providerTransactionRef: "pi_6" });
  });

  it("normalizes account.updated", () => {
    const event = provider.parseWebhookEvent(
      stripeEvent("evt_7", "account.updated", {
        id: "acct_1",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),
    );
    expect(event).toEqual({
      kind: "account_updated",
      providerEventId: "evt_7",
      payoutAccountRef: "acct_1",
      status: { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true },
    });
  });

  it("falls back to unhandled for event types we don't process", () => {
    const event = provider.parseWebhookEvent(
      stripeEvent("evt_8", "customer.created", { id: "cus_1" }),
    );
    expect(event).toEqual({
      kind: "unhandled",
      providerEventId: "evt_8",
      providerEventType: "customer.created",
    });
  });
});
