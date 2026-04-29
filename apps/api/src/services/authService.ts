import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const SALT_ROUNDS = 12;

export async function registerUser(email: string, username: string, password: string) {
  // Check if user exists
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    throw new Error(existing.email === email ? 'Email already registered' : 'Username already taken');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { 
      email, 
      username, 
      passwordHash,
      supabaseId: `local_${Date.now()}` // Fallback for local registration
    },
    select: { id: true, email: true, username: true, avatarUrl: true, createdAt: true },
  });

  const token = generateToken(user.id);
  return { ...user, token };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, username: true, avatarUrl: true, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user.id);
  const { passwordHash: _, ...userData } = user;
  return { ...userData, token };
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { games: true, sessions: true } },
    },
  });

  if (!user) throw new Error('User not found');
  return user;
}

function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}
