export function buildOtpEmail(otp: string): { subject: string; html: string } {
  const html = `
    <p>Hello,</p>
    <p>Your password reset code is:</p>
    <h2 style="letter-spacing:4px;">${otp}</h2>
    <p>This code expires in <strong>1 minute</strong>. Do not share it with anyone.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>Best regards,<br/>Monk Scents</p>
  `;

  return { subject: "Your password reset code", html };
}
