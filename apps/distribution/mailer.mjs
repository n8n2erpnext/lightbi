export async function createMailer(config) {
  if (!config.host || !config.user || !config.password || !config.from) return { enabled: false };
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.default.createTransport({
    host: config.host,
    port: Number(config.port || 465),
    secure: String(config.secure ?? 'true') !== 'false',
    auth: { user: config.user, pass: config.password },
  });
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  async function sendPasswordReset({ to, resetUrl }) {
    await transport.sendMail({
      from: `LightBI Support <${config.from}>`, to,
      subject: 'Reset your LightBI Distribution admin password',
      text: `A password reset was requested for the LightBI Distribution administrator. Open this one-time link within 15 minutes:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
      html: `<p>A password reset was requested for the LightBI Distribution administrator.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>This one-time link expires in 15 minutes. If you did not request this, ignore this email.</p>`,
    });
  }
  async function sendProLicense({ to, licenseKey, template = 'automatic', kind = 'paid', label, discountPercent, expiresAt }) {
    const manual = template === 'manual';
    const offer = kind === 'partner_discount';
    const title = offer ? 'Your LightBI Pro partner offer' : manual ? 'Your LightBI Pro complimentary license' : 'Your LightBI Pro purchase is ready';
    const detail = offer
      ? `This offer code provides ${Number(discountPercent) || 0}% off a future LightBI Pro checkout${label ? ` for ${escapeHtml(label)}` : ''}. It does not activate Pro by itself.`
      : manual ? `This complimentary Pro license was issued by LightBI Support${label ? ` for ${escapeHtml(label)}` : ''}.` : 'Your payment was confirmed and your LightBI Pro license is ready.';
    const credentialLabel = offer ? 'Offer code' : 'License key';
    const instruction = offer ? 'Keep this offer code private. Apply it during Pro checkout when partner checkout becomes available.' : 'Activate it in LightBI Settings. Keep this key private.';
    const expiry = expiresAt ? `<p style="margin:8px 0;color:#64748b">Valid until: <strong>${String(expiresAt).slice(0,10)}</strong></p>` : '';
    await transport.sendMail({
      from: `LightBI Support <${config.from}>`, to,
      subject: title,
      text: `${title}\n\n${detail}\n\n${credentialLabel}: ${licenseKey}\n${expiresAt ? `Valid until: ${String(expiresAt).slice(0,10)}\n` : ''}\n${instruction}`,
      html: `<div style="margin:0;background:#f6f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:620px;margin:auto;background:white;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden"><div style="background:#080d1f;padding:24px 30px;color:white"><strong style="font-size:22px">Light<span style="color:#ffc400">BI</span></strong><div style="margin-top:8px;color:#a8b2c7;font-size:12px">Evidence-governed business analysis</div></div><div style="padding:30px"><h1 style="font-size:24px;margin:0 0 14px">${title}</h1><p style="line-height:1.6;color:#475569">${detail}</p><div style="margin:24px 0;padding:18px;background:#f8fafc;border:1px solid #dbe3ef;border-radius:10px"><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.08em">${credentialLabel}</div><code style="display:block;margin-top:8px;font-size:16px;overflow-wrap:anywhere;color:#1d4ed8">${licenseKey}</code></div>${expiry}<p style="line-height:1.6;color:#475569">${instruction}</p></div><div style="padding:18px 30px;background:#f8fafc;color:#64748b;font-size:12px">Need help? Reply to this email or contact support@thaiduy.digital.</div></div></div>`,
    });
  }
  async function sendAccountVerification({to,verifyUrl}) {
    await transport.sendMail({from:`LightBI Support <${config.from}>`,to,subject:'Verify your LightBI account',text:`Verify your LightBI account within 30 minutes:\n\n${verifyUrl}\n\nIf you did not register, ignore this email.`,html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px"><h1>Verify your LightBI account</h1><p>Confirm this email to activate your account. The link expires in 30 minutes.</p><p><a style="display:inline-block;background:#111827;color:white;padding:12px 18px;border-radius:8px;text-decoration:none" href="${escapeHtml(verifyUrl)}">Verify email</a></p><p style="color:#64748b">Your business files, SQL and analysis remain local to LightBI.</p></div>`});
  }
  async function sendAccountPasswordReset({to,resetUrl}) {
    await transport.sendMail({from:`LightBI Support <${config.from}>`,to,subject:'Reset your LightBI account password',text:`Reset your LightBI account password within 15 minutes:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px"><h1>Reset your LightBI password</h1><p>This one-time link expires in 15 minutes.</p><p><a style="display:inline-block;background:#111827;color:white;padding:12px 18px;border-radius:8px;text-decoration:none" href="${escapeHtml(resetUrl)}">Reset password</a></p></div>`});
  }
  return { enabled: true, sendPasswordReset, sendProLicense, sendAccountVerification, sendAccountPasswordReset, verify: () => transport.verify() };
}
