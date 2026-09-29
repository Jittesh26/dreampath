import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') || 'Scholarship Deadline';
  const provider = searchParams.get('provider') || 'DreamPath Verified Provider';
  const closeDateStr = searchParams.get('closeDate') || '';
  const sourceUrl = searchParams.get('sourceUrl') || 'https://dreampath.my';

  if (!closeDateStr) {
    return new NextResponse('Missing closeDate', { status: 400 });
  }

  const closeDate = new Date(closeDateStr);
  if (isNaN(closeDate.getTime())) {
    return new NextResponse('Invalid closeDate', { status: 400 });
  }

  // Format in UTC for ICS: YYYYMMDDTHHMMSSZ
  // Default deadline is 23:59:59 MYT (UTC+8) -> 15:59:59 UTC
  const year = closeDate.getUTCFullYear();
  const month = String(closeDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(closeDate.getUTCDate()).padStart(2, '0');

  const dtStart = `${year}${month}${day}T150000Z`;
  const dtEnd = `${year}${month}${day}T160000Z`;
  const uid = `dreampath-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@dreampath.my`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DreamPath//Malaysian Scholarship Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Deadline: ${name} (${provider})`,
    `DESCRIPTION:Official application deadline for ${name} sponsored by ${provider}. Official Portal: ${sourceUrl}\\n\\nVerified via DreamPath.`,
    `LOCATION:${sourceUrl}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P2D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: 2 days left to submit application for ${name}!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name.replace(/[^a-zA-Z0-9]/g, '_')}_deadline.ics"`,
    },
  });
}
