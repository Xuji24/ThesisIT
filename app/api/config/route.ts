import { NextResponse } from 'next/server';
import { configPayload } from '../../../lib/server/llm-providers';

export async function GET() {
  return NextResponse.json(configPayload());
}
