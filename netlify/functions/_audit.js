const STATUS_PT = {
  disponivel: 'Disponível',
  em_uso: 'Em Uso',
  manutencao: 'Em Manutenção',
  inativo: 'Inativo',
}

const FIELD_LABELS = {
  name: 'Nome', brand: 'Marca', model: 'Modelo', category_id: 'Categoria',
  serial_number: 'Nº de Série', asset_tag: 'Patrimônio', status: 'Status',
  location_id: 'Local', assigned_to: 'Responsável', purchase_date: 'Data de Compra',
  purchase_price: 'Valor de Compra', notes: 'Observações',
  role: 'Perfil', email: 'E-mail', active: 'Ativo',
}

function formatFieldValue(field, value) {
  if (value === null || value === undefined || value === '') return null
  if (field === 'status') return STATUS_PT[value] || value
  if (field === 'active') return value ? 'Sim' : 'Não'
  if (field === 'purchase_price') return `R$ ${Number(value).toFixed(2)}`
  if (field === 'purchase_date') {
    try { return new Date(value).toLocaleDateString('pt-BR') } catch { return String(value) }
  }
  return String(value)
}

function computeDiff(before, after, fields) {
  const changes = []
  for (const field of fields) {
    const oldVal = before[field]
    const newVal = after[field]
    const oldStr = (oldVal === null || oldVal === undefined) ? '' : String(oldVal)
    const newStr = (newVal === null || newVal === undefined) ? '' : String(newVal)
    if (oldStr !== newStr) {
      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        old_value: formatFieldValue(field, oldVal),
        new_value: formatFieldValue(field, newVal),
      })
    }
  }
  return changes
}

async function resolveIdFields(sql, changes) {
  for (const change of changes) {
    if (change.field === 'category_id') {
      change.label = 'Categoria'
      if (change.old_value) {
        try { const r = await sql`SELECT name FROM categories WHERE id = ${parseInt(change.old_value)}`; if (r[0]) change.old_value = r[0].name } catch (_) {}
      }
      if (change.new_value) {
        try { const r = await sql`SELECT name FROM categories WHERE id = ${parseInt(change.new_value)}`; if (r[0]) change.new_value = r[0].name } catch (_) {}
      }
    }
    if (change.field === 'location_id') {
      change.label = 'Local'
      if (change.old_value) {
        try { const r = await sql`SELECT name FROM locations WHERE id = ${parseInt(change.old_value)}`; if (r[0]) change.old_value = r[0].name } catch (_) {}
      }
      if (change.new_value) {
        try { const r = await sql`SELECT name FROM locations WHERE id = ${parseInt(change.new_value)}`; if (r[0]) change.new_value = r[0].name } catch (_) {}
      }
    }
  }
  return changes
}

async function getUserName(sql, userId) {
  if (!userId) return null
  try { const rows = await sql`SELECT name FROM users WHERE id = ${userId}`; return rows[0]?.name || null } catch { return null }
}

async function ensureAuditTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      entity_name VARCHAR(200),
      action VARCHAR(50) NOT NULL,
      changes JSONB,
      user_id INTEGER,
      user_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
}

async function logAudit(sql, { entityType, entityId, entityName, action, changes, userId, userName }) {
  const doInsert = async () => sql`
    INSERT INTO audit_log (entity_type, entity_id, entity_name, action, changes, user_id, user_name)
    VALUES (${entityType}, ${entityId}, ${entityName ?? null}, ${action},
            ${changes ? JSON.stringify(changes) : null}, ${userId ?? null}, ${userName ?? null})
  `
  try {
    await doInsert()
  } catch (err) {
    if (err.message?.includes('audit_log') || err.code === '42P01') {
      try { await ensureAuditTable(sql); await doInsert() } catch (e) { console.error('[audit] retry failed:', e.message) }
    } else {
      console.error('[audit] failed:', err.message)
    }
  }
}

module.exports = { logAudit, ensureAuditTable, computeDiff, resolveIdFields, getUserName, FIELD_LABELS }
