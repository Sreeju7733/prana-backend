import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function verifyToken(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, JWT_SECRET) as { id: string, phone: string };
    } catch {
        throw new Error('Invalid token');
    }
}
