const bcrypt = require('bcryptjs')
const ROUNDS = 12

async function hashPassword(password) {
  return bcrypt.hash(password, ROUNDS)
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

module.exports = { hashPassword, comparePassword }
