import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key || url.includes('your-supabase-project-id')) {
            return NextResponse.json({
                connected: false,
                error: 'Missing or placeholder Supabase credentials in .env.local'
            }, { status: 400 });
        }

        // Perform a lightweight database query to test connection
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            return NextResponse.json({
                connected: false,
                error: error.message,
                code: error.code,
                hint: error.hint
            }, { status: 500 });
        }

        return NextResponse.json({
            connected: true,
            message: 'Successfully connected to Supabase database!'
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({
            connected: false,
            error: message
        }, { status: 500 });
    }
}
