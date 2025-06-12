import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import SlackProvider from 'next-auth/providers/slack'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateUniqueUsername } from '@/lib/username'

const prisma = new PrismaClient()

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    SlackProvider({
      clientId: process.env.NEXTAUTH_SLACK_CLIENT_ID || process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.NEXTAUTH_SLACK_CLIENT_SECRET || process.env.SLACK_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'identity.basic identity.email identity.avatar identity.team',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error('User not found')
        }

        if (!user.emailVerified) {
          throw new Error('Please verify your email first')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('Invalid password')
        }

        return user
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        let username = user.username
        if (!username) {
          username = await generateUniqueUsername(user.name)
          await prisma.user.update({
            where: { id: user.id },
            data: { username },
          })
        }

        token.username = username
      }

      if (trigger === 'update') {
        token.username = session.user.username
      }

      return token
    },
    async session({ session, token }) {
      session.user.id = token.id || token.sub
      let username = token.username
      if (!username) {
        username = await generateUniqueUsername(session.user.name)
        await prisma.user.update({
          where: { id: session.user.id },
          data: { username },
        })
      }
      session.user.username = username
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST } 