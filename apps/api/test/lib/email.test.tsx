import PasswordResetEmail from "@guilders/transactional/emails/password-reset";
import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";

import { sendEmail } from "../../src/lib/email";

describe("sendEmail", () => {
  it("renders the template to HTML and plain text then sends through the EMAIL binding", async () => {
    const send = vi.spyOn(env.EMAIL, "send");

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Reset your password",
      react: (
        <PasswordResetEmail
          dashboardUrl="http://localhost:3002"
          userEmail="user@example.com"
          resetUrl="http://localhost:3002/recovery?token=test"
        />
      ),
    });

    expect(result).toEqual({ messageId: "email_test_mock" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { email: "noreply@guilders.app", name: "Guilders" },
        to: "user@example.com",
        subject: "Reset your password",
        html: expect.stringContaining("Reset your password"),
        text: expect.stringContaining("RESET YOUR PASSWORD"),
      }),
    );

    const payload = send.mock.calls[0]?.[0] as { html: string; text: string };
    expect(payload.html).toContain("<");
    expect(payload.text).not.toContain("<html");
  });

  it("logs and rethrows when the EMAIL binding fails", async () => {
    const error = Object.assign(new Error("sender domain not verified"), {
      code: "E_SENDER_NOT_VERIFIED",
    });
    vi.spyOn(env.EMAIL, "send").mockRejectedValueOnce(error);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendEmail({
        to: "user@example.com",
        subject: "Reset your password",
        react: (
          <PasswordResetEmail
            dashboardUrl="http://localhost:3002"
            userEmail="user@example.com"
            resetUrl="http://localhost:3002/recovery?token=test"
          />
        ),
      }),
    ).rejects.toMatchObject({ code: "E_SENDER_NOT_VERIFIED" });

    expect(consoleError).toHaveBeenCalledWith(
      "[email] Failed to send",
      expect.objectContaining({
        to: "user@example.com",
        subject: "Reset your password",
        code: "E_SENDER_NOT_VERIFIED",
      }),
    );
  });
});
