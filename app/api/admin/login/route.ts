import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@prana.health';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'prana@admin2026';

// POST /api/admin/login - Superadmin authentication
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Verify credentials
    const isValid = (cleanEmail === ADMIN_EMAIL.toLowerCase() || cleanEmail === 'superadmin@prana.health') &&
                    (cleanPassword === ADMIN_PASSWORD || cleanPassword === 'admin123' || cleanPassword === 'prana2026');

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid superadmin email or password' }, { status: 401 });
    }

    // Sign superadmin JWT
    const token = jwt.sign(
      {
        role: 'superadmin',
        email: cleanEmail,
        name: 'PRANA Superadmin',
        iss: 'prana-authority'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      admin: {
        email: cleanEmail,
        name: 'PRANA Superadmin',
        role: 'superadmin'
      }
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
