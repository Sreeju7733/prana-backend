import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface UserPayload {
    id: string;
    phone?: string;
    prana_id?: string;
    role?: string;
}

export interface HospitalTokenPayload {
    hospital_uuid: string;
    hospital_id: string;
    hospital_name: string;
    station_id?: string;
    role: string;
    tier_access?: string[];
}

export function verifyToken(req: Request): UserPayload {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
        return decoded;
    } catch {
        throw new Error('Invalid token');
    }
}

export function verifyHospitalToken(req: Request): HospitalTokenPayload {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized: Missing hospital authorization token');
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as HospitalTokenPayload;
        if (!decoded || (!decoded.hospital_id && decoded.role !== 'superadmin')) {
            throw new Error('Unauthorized: Invalid hospital token claims');
        }
        return decoded;
    } catch {
        throw new Error('Unauthorized: Invalid or expired hospital token');
    }
}

export function verifyAdminToken(req: Request): { role: string } {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized: Missing administrator token');
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { role?: string; hospital_id?: string };
        return decoded as { role: string };
    } catch {
        throw new Error('Unauthorized: Invalid or expired administrator token');
    }
}
