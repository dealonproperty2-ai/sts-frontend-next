import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AdminTokenPayload {
  id: string;
  email?: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function verifyAdmin(
  req: Request
): { payload: AdminTokenPayload } | { error: NextResponse } {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }) };
  }

  try {
    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    if (payload.role !== 'admin') {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    return { payload };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }
}
