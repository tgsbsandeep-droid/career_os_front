/**
 * EmailJS service — sends emails directly from the browser via EmailJS REST API.
 * Keys are read from VITE_EMAILJS_* environment variables.
 * Docs: https://www.emailjs.com/docs/rest-api/send/
 */

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined;

export type EmailJSResult = { sent: boolean; reason?: string };

/**
 * Send an email via EmailJS REST API.
 * `templateParams` must match the variable names in your EmailJS template.
 */
export async function sendEmail(
  templateParams: Record<string, string>,
  overrides?: { serviceId?: string; templateId?: string; publicKey?: string },
): Promise<EmailJSResult> {
  const serviceId  = overrides?.serviceId  ?? SERVICE_ID;
  const templateId = overrides?.templateId ?? TEMPLATE_ID;
  const publicKey  = overrides?.publicKey  ?? PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn("[emailjs] Missing VITE_EMAILJS_* env vars — email not sent.");
    return { sent: false, reason: "EmailJS not configured (missing env vars)." };
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id:      serviceId,
        template_id:     templateId,
        user_id:         publicKey,
        template_params: templateParams,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { sent: false, reason: `EmailJS ${response.status}: ${text.slice(0, 200)}` };
    }

    return { sent: true };
  } catch (err) {
    return { sent: false, reason: (err as Error).message ?? "EmailJS send failed." };
  }
}

/**
 * Send a welcome email after signup.
 * Template must have: {{to_email}}, {{to_name}}, {{subject}}, {{message}}
 */
export async function sendWelcomeEmail(params: {
  toEmail: string;
  toName: string;
}): Promise<EmailJSResult> {
  return sendEmail({
    to_email: params.toEmail,
    to_name:  params.toName,
    subject:  "Welcome to CareerOS 🎉",
    message:  `Hi ${params.toName},\n\nWelcome to CareerOS! Your account has been created successfully.\n\nPlease check your inbox for a confirmation link to activate your account.\n\nOnce confirmed, you can log in and start exploring jobs, courses, and career tools.\n\nBest regards,\nThe CareerOS Team`,
  });
}