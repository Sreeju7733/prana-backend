import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// GET /api/family/dependents - List linked family/dependents cards
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // Mock linked family/dependents list
        const mockDependents = [
            {
                id: 'dep-101-uuid',
                full_name: 'Elder Parent (Mother)',
                relationship: 'mother',
                prana_id: 'PRAN-MOTH-8812',
                blood_group: 'O+',
                card_status: 'active'
            }
        ];

        return NextResponse.json({
            success: true,
            user_id: user.id,
            data: mockDependents
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
