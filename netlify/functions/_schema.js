/**
 * Executa uma migração de schema (ALTER/CREATE ... IF NOT EXISTS) no máximo uma vez por
 * instância "quente" da function, em vez de a cada requisição.
 *
 * Por quê: ALTER TABLE pede lock exclusivo na tabela mesmo quando a coluna já existe.
 * Rodar isso em todo login/listagem faz as requisições concorrentes esperarem umas pelas
 * outras. Se a migração falhar, nada é memorizado e ela é tentada de novo na próxima.
 * As migrações precisam ser idempotentes (IF NOT EXISTS), pois duas instâncias frias
 * podem rodá-las ao mesmo tempo.
 */
const done = new Set()

async function ensureOnce(key, migrate) {
  if (done.has(key)) return
  await migrate()
  done.add(key)
}

module.exports = { ensureOnce }
