'use server';

import { db } from '@/db';
import { dataReports } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function reportMistake(formData: FormData) {
  const scholarshipId = formData.get('scholarshipId') as string;
  const message = formData.get('message') as string;

  if (!scholarshipId || !message) {
    return { error: 'Missing required fields' };
  }

  try {
    await db.insert(dataReports).values({
      scholarshipId,
      message,
    });
    
    // Optionally revalidate or trigger notification
    return { success: true };
  } catch (err) {
    console.error('Failed to submit report', err);
    return { error: 'Failed to submit report. Please try again.' };
  }
}
