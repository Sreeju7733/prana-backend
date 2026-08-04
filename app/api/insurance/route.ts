import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/insurance - Fetch insurance policy for logged in user
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // Fetch insurance from insurance_policies table
        const { data, error } = await supabase
            .from('insurance_policies')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error('Fetch insurance error:', error);
        }

        return NextResponse.json({ success: true, data: data || null }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

// POST /api/insurance - Upsert insurance policy
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        const provider_name = body.provider_name || body.provider || '';
        const policy_number = body.policy_number || body.policyNumber || '';
        const group_number = body.group_number || body.groupNumber || '';
        const helpline_phone = body.helpline_phone || body.helpline || '';
        const coverage_type = body.coverage_type || body.coverageType || 'Comprehensive';

        if (!provider_name) {
            return NextResponse.json({ success: false, error: 'Provider name is required' }, { status: 400 });
        }

        // Try upserting to insurance_policies table
        const { data: existing } = await supabase
            .from('insurance_policies')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        let resultData: any = null;

        if (existing?.id) {
            const { data, error } = await supabase
                .from('insurance_policies')
                .update({
                    provider_name,
                    policy_number,
                    group_number,
                    helpline_phone,
                    coverage_type,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                console.error('Update insurance error:', error);
            }
            resultData = data;
        } else {
            const { data, error } = await supabase
                .from('insurance_policies')
                .insert({
                    user_id: user.id,
                    provider_name,
                    policy_number,
                    group_number,
                    helpline_phone,
                    coverage_type
                })
                .select()
                .single();

            if (error) {
                console.error('Insert insurance error:', error);
            }
            resultData = data;
        }

        // Fallback object if table is not migrated yet in local env
        const payload = resultData || {
            id: existing?.id || 'ins_' + Date.now(),
            user_id: user.id,
            provider_name,
            policy_number,
            group_number,
            helpline_phone,
            coverage_type
        };

        return NextResponse.json({ success: true, data: payload }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to save insurance';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// DELETE /api/insurance - Delete insurance policy
export async function DELETE(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { error } = await supabase
            .from('insurance_policies')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete insurance error:', error);
        }

        return NextResponse.json({ success: true, message: 'Insurance deleted' }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete insurance';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
