import { Resend } from "resend";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly client: Resend,
    private readonly fromAddress: string,
  ) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const result = await this.client.emails.send({
      from: this.fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, providerMessageId: result.data?.id };
  }
}
