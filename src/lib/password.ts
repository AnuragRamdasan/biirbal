import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateTokenExpiry(): Date {
  const now = new Date()
  now.setHours(now.getHours() + 1) // Token expires in 1 hour
  return now
}