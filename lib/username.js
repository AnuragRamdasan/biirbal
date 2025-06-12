import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function generateUniqueUsername(name) {
  if (!name) {
    name = 'user'
  }

  // Convert name to lowercase and remove special characters
  let baseUsername = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15)

  let username = baseUsername
  let counter = 1

  // Keep trying until we find a unique username
  while (true) {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (!existingUser) {
      return username
    }

    // If username exists, append a number and try again
    username = `${baseUsername}${counter}`
    counter++

    // Prevent infinite loops by limiting the counter
    if (counter > 1000) {
      throw new Error('Could not generate unique username')
    }
  }
} 