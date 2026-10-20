/** Remove tudo que não for dígito. */
function normalizeCpf(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/** Valida CPF (11 dígitos, não repetidos, dígitos verificadores corretos). */
function isValidCpf(value) {
  const cpf = normalizeCpf(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const digit = (len) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

module.exports = { normalizeCpf, isValidCpf }
