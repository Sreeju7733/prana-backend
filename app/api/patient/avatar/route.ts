import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        const { imageBase64, avatarUrl } = body;

        let finalUrl = avatarUrl;

        if (imageBase64) {
            try {
                // If base64 provided, upload to Supabase storage bucket 'avatars'
                const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
                const base64Data = match ? match[2] : imageBase64;
                const contentType = match ? match[1] : 'image/jpeg';
                const extension = contentType.split('/')[1] || 'jpeg';

                const fileName = `${user.id}_${Date.now()}.${extension}`;
                const buffer = Buffer.from(base64Data, 'base64');

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, buffer, {
                        contentType,
                        upsert: true,
                    });

                if (!uploadError && uploadData) {
                    const { data: publicUrlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName);
                    
                    finalUrl = publicUrlData.publicUrl;
                } else {
                    // Fallback to storing raw base64 data string
                    finalUrl = imageBase64;
                }
            } catch (_) {
                finalUrl = imageBase64;
            }
        }

        if (!finalUrl) {
            return NextResponse.json({ error: 'No avatar image or URL provided' }, { status: 400 });
        }

        let targetId = user.id;
        const { data: userProfile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
        if (!userProfile) {
            const { data: latest } = await supabase.from('profiles').select('id').order('created_at', { ascending: false }).limit(1);
            if (latest && latest.length > 0) {
                targetId = latest[0].id;
            }
        }

        // Update profile in Supabase
        const { data: profile, error } = await supabase
            .from('profiles')
            .update({
                avatar_url: finalUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            avatar_url: finalUrl,
            profile,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
