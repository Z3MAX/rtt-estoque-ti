const nodemailer = require('nodemailer')

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  })
}

const FROM = () => {
  const user = process.env.SMTP_USER
  const name = process.env.SMTP_FROM_NAME || 'Rema Tip Top'
  return user ? `${name} <${user}>` : `${name} <noreply@rematiptop.com.br>`
}

/** Escapa caracteres especiais HTML para prevenir injeção em templates de e-mail. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { skipped: true, reason: 'SMTP_USER ou SMTP_PASS não configurado' }
  }
  try {
    const transporter = createTransporter()
    const info = await transporter.sendMail({ from: FROM(), to, subject, html })
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    console.error('[email] falha ao enviar:', err.message)
    return { sent: false, error: err.message }
  }
}

/**
 * E-mail de convite para novo usuário.
 * Envia um link para definição de senha — nunca envia a senha em texto.
 */
async function sendInviteEmail({ name, email, inviteUrl, role }) {
  const roleLabel = role || 'Gestor'
  const roleColor = (role === 'Administrador de RH' || role === 'Administrador de TI') ? '#e30613' : '#10b981'
  const siteUrl = process.env.SITE_URL || ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#7f0008 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700">Rema Tip Top</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">Gestão de Talentos e Avaliações</p>
          <p style="margin:20px 0 0;color:#fff;font-size:22px;font-weight:700">Você foi convidado!</p>
        </td></tr>
        <tr><td style="background:#fff;padding:36px 40px">
          <p style="margin:0 0 20px;color:#0f172a;font-size:20px;font-weight:700">Olá, ${esc(name)} 👋</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
            Seu acesso à plataforma de <strong>Gestão de Talentos e Avaliações</strong> da Rema Tip Top foi criado.
            Clique no botão abaixo para definir sua senha e ativar sua conta.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:16px 24px">
              <p style="margin:0 0 8px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Seu perfil</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;color:#94a3b8;font-size:13px;width:60px">E-mail</td>
                  <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:600">${esc(email)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#94a3b8;font-size:13px">Perfil</td>
                  <td style="padding:4px 0">
                    <span style="background:${esc(roleColor)}20;color:${esc(roleColor)};font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px">${esc(roleLabel)}</span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td align="center">
              <a href="${esc(inviteUrl)}" style="display:inline-block;background:#e30613;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px">
                Definir minha senha →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-align:center">
            Este link é válido por <strong>7 dias</strong>.
          </p>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center">
            Se você não esperava este convite, ignore este e-mail.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© 2025 Rema Tip Top · Todos os direitos reservados</p>
          ${siteUrl ? `<p style="margin:6px 0 0;color:#cbd5e1;font-size:11px"><a href="${esc(siteUrl)}" style="color:#cbd5e1">${esc(siteUrl)}</a></p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendMail({ to: email, subject: '🔐 Seu convite para a plataforma Rema Tip Top', html })
}

async function sendResetEmail({ name, email, resetUrl }) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#7f0008 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700">Rema Tip Top</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">Gestão de Talentos e Avaliações</p>
          <p style="margin:20px 0 0;color:#fff;font-size:22px;font-weight:700">Redefinição de senha</p>
        </td></tr>
        <tr><td style="background:#fff;padding:36px 40px">
          <p style="margin:0 0 20px;color:#0f172a;font-size:20px;font-weight:700">Olá, ${esc(name)} 👋</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
            Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td align="center">
              <a href="${esc(resetUrl)}" style="display:inline-block;background:#e30613;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px">
                Redefinir minha senha →
              </a>
            </td></tr>
          </table>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
            <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase">Ou copie o link</p>
            <p style="margin:0;color:#e30613;font-size:12px;word-break:break-all">${esc(resetUrl)}</p>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center">
            Se você não solicitou a redefinição, ignore este e-mail.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© 2025 Rema Tip Top · Todos os direitos reservados</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendMail({ to: email, subject: '🔐 Redefinição de senha — Rema Tip Top', html })
}

/**
 * Relatório de equipamentos de um local, enviado ao gestor responsável.
 */
async function sendLocationReport({ locationName, managerEmail, equipment, senderName }) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const total = equipment.length

  const STATUS_LABEL = { disponivel: 'Disponível', em_uso: 'Em Uso', manutencao: 'Em Manutenção', inativo: 'Inativo' }
  const STATUS_COLOR = { disponivel: '#10b981', em_uso: '#3b82f6', manutencao: '#f59e0b', inativo: '#94a3b8' }

  const countByStatus = Object.entries(
    equipment.reduce((acc, eq) => { acc[eq.status] = (acc[eq.status] || 0) + 1; return acc }, {})
  )

  const tableRows = equipment.map((eq, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
      <td style="padding:10px 14px;color:#0f172a;font-size:13px;font-weight:500">${esc(eq.name)}</td>
      <td style="padding:10px 14px;color:#475569;font-size:12px">${esc(eq.category_name || '—')}</td>
      <td style="padding:10px 14px">
        <span style="background:${STATUS_COLOR[eq.status] || '#94a3b8'}20;color:${STATUS_COLOR[eq.status] || '#94a3b8'};font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;white-space:nowrap">
          ${esc(STATUS_LABEL[eq.status] || eq.status)}
        </span>
      </td>
      <td style="padding:10px 14px;color:#64748b;font-size:12px;font-family:monospace">${esc(eq.serial_number || '—')}</td>
      <td style="padding:10px 14px;color:#64748b;font-size:12px;font-family:monospace">${esc(eq.asset_tag || '—')}</td>
      <td style="padding:10px 14px;color:#475569;font-size:12px">${esc(eq.assigned_to || '—')}</td>
    </tr>`).join('')

  const summaryChips = countByStatus.map(([status, count]) => `
    <td style="padding:0 8px;text-align:center">
      <div style="background:${STATUS_COLOR[status] || '#94a3b8'}15;border:1px solid ${STATUS_COLOR[status] || '#94a3b8'}30;border-radius:10px;padding:10px 16px;min-width:80px">
        <p style="margin:0;color:${STATUS_COLOR[status] || '#94a3b8'};font-size:22px;font-weight:700">${count}</p>
        <p style="margin:4px 0 0;color:#64748b;font-size:11px">${esc(STATUS_LABEL[status] || status)}</p>
      </div>
    </td>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#7f0008 100%);border-radius:16px 16px 0 0;padding:32px 40px">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700">Rema Tip Top</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">Gestão de Talentos e Avaliações</p>
          <p style="margin:24px 0 0;color:#fff;font-size:20px;font-weight:700">📍 Relatório de Equipamentos</p>
          <p style="margin:6px 0 0;color:#e2e8f0;font-size:14px">Local: <strong>${esc(locationName)}</strong></p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">Gerado em ${esc(date)}${senderName ? ` · por ${esc(senderName)}` : ''}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:36px 40px">

          <!-- Total -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Total de equipamentos</p>
              <p style="margin:0;color:#0f172a;font-size:32px;font-weight:800">${total}</p>
            </td></tr>
          </table>

          <!-- Status summary -->
          ${countByStatus.length > 0 ? `
          <p style="margin:0 0 12px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Resumo por status</p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>${summaryChips}</tr>
          </table>` : ''}

          <!-- Equipment table -->
          <p style="margin:0 0 12px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Lista completa</p>
          ${total === 0 ? `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:32px;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:14px">Nenhum equipamento neste local</p>
          </div>` : `
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;border-collapse:collapse">
            <thead>
              <tr style="background:#f1f5f9">
                <th style="padding:10px 14px;text-align:left;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Equipamento</th>
                <th style="padding:10px 14px;text-align:left;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Categoria</th>
                <th style="padding:10px 14px;text-align:left;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Status</th>
                <th style="padding:10px 14px;text-align:left;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Nº Série</th>
                <th style="padding:10px 14px;text-align:left;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Patrimônio</th>
                <th style="padding:10px 14px;text-align:left;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Responsável</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>`}

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© 2025 Rema Tip Top · Gestão de Talentos e Avaliações</p>
          <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px">Este relatório foi gerado automaticamente pelo sistema.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendMail({
    to: managerEmail,
    subject: `📋 Relatório de equipamentos — ${locationName}`,
    html,
  })
}

/**
 * E-mail de solicitação de assinatura digital para instrutor.
 */
async function sendSignatureRequestEmail({ name, email, signUrl }) {
  const siteUrl = process.env.SITE_URL || ''
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cadastre sua assinatura digital</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);padding:36px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#93c5fd;letter-spacing:3px;text-transform:uppercase;">RTT Shop · Treinamentos</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;">Assinatura Digital</h1>
          <p style="margin:10px 0 0;font-size:14px;color:#bfdbfe;">Necessária para certificados de conclusão</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 8px;font-size:15px;color:#334155;">Olá, <strong>${esc(name)}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
            O RH solicitou que você cadastre sua <strong>assinatura digital</strong> no sistema.
            Ela será utilizada nos certificados de conclusão emitidos para os colaboradores que
            concluírem seus cursos.
          </p>

          <!-- Info box -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Como funciona</p>
            <ul style="margin:0;padding-left:20px;font-size:13px;color:#475569;line-height:2;">
              <li>Clique no botão abaixo</li>
              <li>Desenhe sua assinatura com o mouse ou dedo</li>
              <li>Clique em <strong>"Salvar assinatura"</strong></li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${signUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.3px;">
              ✍️ &nbsp;Cadastrar minha assinatura
            </a>
          </div>

          <!-- Expiry warning -->
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#92400e;">
              ⏳ &nbsp;Este link expira em <strong>24 horas</strong>. Caso expire, peça ao RH que envie um novo link.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">© 2025 Rema Tip Top · Gestão de Talentos</p>
          <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Se você não reconhece este e-mail, ignore-o com segurança.</p>
          ${siteUrl ? `<p style="margin:8px 0 0;"><a href="${siteUrl}" style="color:#93c5fd;font-size:11px;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a></p>` : ''}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendMail({ to: email, subject: '✍️ Cadastre sua assinatura digital — RTT Shop', html })
}

module.exports = { sendInviteEmail, sendResetEmail, sendLocationReport, sendSignatureRequestEmail }
