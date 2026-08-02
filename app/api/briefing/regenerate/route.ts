import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generateEmergencySummary } from '@/lib/summary_generator';

function jsonResponse(data: unknown = null, error: unknown = null, status = 200) {
    return NextResponse.json({ data, error }, { status });
}

// POST /api/briefing/regenerate - Trigger Emergency Summary refresh
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const briefingResult = await generateEmergencySummary(user.id);
        return jsonResponse(briefingResult, null, 200);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return jsonResponse(null, { code: 'unauthorized', message }, 401);
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
