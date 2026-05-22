import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET;

export async function verifyGoogleTokenAndLogin(idToken: string) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth is not configured on the server.');
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  
  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new Error('Invalid Google token');

  const { email, sub: googleId, name, picture } = payload;
  
  // Find user by Google ID or Email
  let user = await prisma.user.findFirst({
    where: { 
      OR: [
        { providerId: googleId, provider: 'GOOGLE' },
        { email }
      ]
    }
  });

  let isNewUser = false;

  if (!user) {
    // Generate a unique username from their name or email prefix
    let baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (baseUsername.length < 3) baseUsername += 'user';
    
    // Ensure username is unique
    let finalUsername = baseUsername;
    let counter = 1;
    // Note: this is a bit slow but safe for a few users
    while (await (prisma.user as any).findFirst({ where: { username: finalUsername } })) {
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }

    user = await prisma.user.create({
      data: {
        email,
        username: finalUsername,
        provider: 'GOOGLE',
        providerId: googleId,
        avatarUrl: picture,
        supabaseId: `google_${googleId}` // Add required supabaseId
      }
    });
    isNewUser = true;
  } else if (user.provider === 'LOCAL') {
    // Optionally link google to local account if email matches
    user = await prisma.user.update({
      where: { id: user.id },
      data: { provider: 'GOOGLE', providerId: googleId, avatarUrl: user.avatarUrl || picture }
    });
  }

  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  
  return { 
    token, 
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
    isNewUser
  };
}
