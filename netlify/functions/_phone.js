/**
 * Telefone brasileiro → formato E.164 ("+5511912345678"), o formato que provedores de
 * SMS/WhatsApp esperam. Aceita com ou sem pontuação, com ou sem "+55".
 * Retorna null se não for um número brasileiro válido.
 */
function normalizePhone(value) {
  let d = String(value ?? '').replace(/\D/g, '')
  if (!d) return null
  // Remove o código do país quando presente (55 + DDD + número = 12 ou 13 dígitos)
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  if (d.length !== 10 && d.length !== 11) return null

  const ddd = Number(d.slice(0, 2))
  if (ddd < 11 || ddd > 99 || String(ddd).includes('0')) return null // DDDs válidos: 11-99, sem zero

  const numero = d.slice(2)
  if (numero.length === 9) {
    if (numero[0] !== '9') return null // celular com 9 dígitos começa com 9
  } else if (!/^[2-9]/.test(numero)) {
    return null // 8 dígitos (fixo ou celular antigo) não começa com 0 ou 1
  }
  return `+55${d}`
}

module.exports = { normalizePhone }
