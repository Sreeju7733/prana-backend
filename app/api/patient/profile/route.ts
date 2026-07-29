import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT
function verifyToken(req: NextRequest) {
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

export async function GET(req: NextRequest) {
    try {
        // Verify user
        const user = verifyToken(req);

        // Fetch profile from Supabase
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: profile });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ error: message }, { status: 401 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const updates = await req.json();

        // Update profile (whitelist allowed fields)
        const allowedUpdates = ['full_name', 'blood_group', 'weight_kg', 'height_cm'];
        const filteredUpdates: Record<string, unknown> = {};
        
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .update(filteredUpdates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, data: profile });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ error: message }, { status: 401 });
    }
}
