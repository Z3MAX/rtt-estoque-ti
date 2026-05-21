const nodemailer = require('nodemailer')

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

const FROM = () =>
  process.env.GMAIL_USER
    ? `RTT TI <${process.env.GMAIL_USER}>`
    : 'RTT TI <noreply@rtt.com>'

async function sendMail({ to, subject, html }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return { skipped: true, reason: 'GMAIL_USER ou GMAIL_APP_PASSWORD não configurado' }
  }
  try {
    const transporter = createTransporter()
    const info = await transporter.sendMail({ from: FROM(), to, subject, html })
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    return { sent: false, error: err.message }
  }
}

async function sendWelcomeEmail({ name, email, password, role, loginUrl }) {
  const roleLabel = role === 'Administrador de TI' ? 'Administrador de TI' : 'Técnico de TI'
  const roleColor = role === 'Administrador de TI' ? '#6366f1' : '#10b981'

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700">RTT</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">Controle de Estoque TI</p>
          <p style="margin:20px 0 0;color:#fff;font-size:22px;font-weight:700">Bem-vindo à plataforma!</p>
        </td></tr>
        <tr><td style="background:#fff;padding:36px 40px">
          <p style="margin:0 0 20px;color:#0f172a;font-size:20px;font-weight:700">Olá, ${name} 👋</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
            Seu acesso ao sistema de controle de estoque de TI da <strong>RTT</strong> foi criado. Use as credenciais abaixo para entrar na plataforma.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 14px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Suas credenciais</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:80px">E-mail</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${email}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Senha</td>
                  <td style="padding:6px 0">
                    <span style="background:#0f172a;color:#e2e8f0;font-family:monospace;font-size:14px;font-weight:600;padding:3px 10px;border-radius:6px">${password}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#94a3b8;font-size:13px">Perfil</td>
                  <td style="padding:6px 0">
                    <span style="background:${roleColor}20;color:${roleColor};font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px">${roleLabel}</span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td align="center">
              <a href="${loginUrl}" style="display:inline-block;background:#6366f1;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px">
                Acessar a Plataforma →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center">
            No primeiro acesso você será solicitado a definir uma senha pessoal.<br>
            Em caso de dúvidas, contate o administrador do sistema.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© 2025 RTT · Todos os direitos reservados</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendMail({ to: email, subject: '🔐 Seu acesso à plataforma RTT foi criado', html })
}

async function sendResetEmail({ name, email, resetUrl }) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700">RTT</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">Controle de Estoque TI</p>
          <p style="margin:20px 0 0;color:#fff;font-size:22px;font-weight:700">Redefinição de senha</p>
        </td></tr>
        <tr><td style="background:#fff;padding:36px 40px">
          <p style="margin:0 0 20px;color:#0f172a;font-size:20px;font-weight:700">Olá, ${name} 👋</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
            Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td align="center">
              <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px">
                Redefinir minha senha →
              </a>
            </td></tr>
          </table>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
            <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase">Ou copie o link</p>
            <p style="margin:0;color:#6366f1;font-size:12px;word-break:break-all">${resetUrl}</p>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center">
            Se você não solicitou a redefinição, ignore este e-mail.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© 2025 RTT · Todos os direitos reservados</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendMail({ to: email, subject: '🔐 Redefinição de senha — RTT', html })
}

module.exports = { sendWelcomeEmail, sendResetEmail }
