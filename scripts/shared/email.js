// Les e-mails sont temporairement désactivés jusqu'à la mise en place d'une
// nouvelle solution d'envoi.
const EMAIL_DISABLED_MESSAGE =
  "L’envoi d’e-mails est temporairement désactivé.";

async function sendNotificationEmail({
  toEmail,
  toName = "",
  subject,
  message,
  actionUrl = "",
}) {
  throw new Error(EMAIL_DISABLED_MESSAGE);
}

window.sendNotificationEmail = sendNotificationEmail;

async function sendSecurityEmail({
  toEmail,
  toName = "",
  subject,
  message,
  code = "",
  resetLink = "",
  expiresAt = "",
}) {
  throw new Error(EMAIL_DISABLED_MESSAGE);
}

window.sendSecurityEmail = sendSecurityEmail;
