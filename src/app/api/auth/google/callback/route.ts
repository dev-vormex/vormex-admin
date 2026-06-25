import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Google OAuth code exchange is handled by the backend.' },
    { status: 410 }
  );
}
