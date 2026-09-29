/**
 * AI Report Summary Generator
 * Uses Google Gemini to summarize medical reports (PDF/image)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    const body = await req.json();
    
    const { reportUrl, reportType } = body; // reportUrl = R2 URL, reportType = 'pdf' | 'image'
    
    if (!reportUrl) {
      return NextResponse.json({ success: false, error: 'reportUrl required' }, { status: 400 });
    }

    // Download the report from R2
    const response = await fetch(reportUrl);
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Failed to download report' }, { status: 500 });
    }

    const buffer = await response.arrayBuffer();
    const mimeType = reportType === 'pdf' ? 'application/pdf' : 'image/jpeg';
    
    // Call Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `You are a medical assistant. Analyze this medical report and extract the following information in a structured format. Do NOT invent anything not present in the document.

Extract:
1. Diagnoses (list all conditions mentioned)
2. Medicines prescribed (name, dosage, frequency)
3. Allergies mentioned
4. Key lab values (abnormal values with references)
5. Doctor recommendations

Return as JSON with these keys: diagnoses, medicines, allergies, lab_values, recommendations`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    
    // Parse the JSON from the response
    let summary;
    try {
      // Extract JSON from response (Gemini might wrap it in markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      summary = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
    } catch {
      summary = { raw: text };
    }

    // Save to database
    const { data: reportRecord, error } = await supabase
      .from('ai_summaries')
      .insert([{
        user_id: user.id,
        report_url: reportUrl,
        summary: summary,
        created_at: new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save summary:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: reportRecord?.id,
        summary,
      },
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    
    const { data, error } = await supabase
      .from('ai_summaries')
      .select('id, report_url, summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
