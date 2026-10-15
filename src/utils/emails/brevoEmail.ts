import { BrevoClient } from "@getbrevo/brevo";
import { env } from "../../config/env";

const brevo = new BrevoClient({
    apiKey: env.brevo.apiKey,
});

export async function sendVerificationEmail(
    email: string,
    code: string
): Promise<void> {
    await brevo.transactionalEmails.sendTransacEmail({
        sender: {
            name: env.brevo.senderName,
            email: env.brevo.senderEmail,
        },
        to: [{ email }],
        subject: "Verify your Splitly email",
        textContent: [
            `Your Splitly verification code is ${code}.`,
            "",
            "This code expires in 10 minutes.",
            "If you did not request this code, you can ignore this email.",
        ].join("\n"),
        htmlContent: `
            <h2>Verify your Splitly email</h2>
            <p>Your verification code is:</p>
            <h1>${code}</h1>
            <p>This code expires in 10 minutes.</p>
            <p>If you did not request this code, ignore this email.</p>
        `,
    });
}


export async function sendPasswordResetEmail(
    email: string,
    code: string
): Promise<void> {
    await brevo.transactionalEmails.sendTransacEmail({
        sender: {
            name: env.brevo.senderName,
            email: env.brevo.senderEmail,
        },
        to: [{ email }],
        subject: "Reset your Splitly password",
        textContent: [
            `Your Splitly password-reset code is ${code}.`,
            "",
            "This code expires in 10 minutes.",
            "If you did not request a password reset, you can ignore this email.",
        ].join("\n"),
        htmlContent: `
            <h2>Reset your Splitly password</h2>
            <p>Use this code to reset your password:</p>
            <h1>${code}</h1>
            <p>This code expires in 10 minutes.</p>
            <p>If you did not request a password reset, you can ignore this email.</p>
        `,
    });
}
