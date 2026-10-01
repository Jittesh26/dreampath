import { chromium } from 'playwright';

async function runInterviewJourneyAudit() {
  console.log('🚀 Starting Resume AI Interview Browser Journey Audit...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const auditLog = [];
  function record(step, description, passed, detail = '') {
    auditLog.push({ step, description, passed, detail });
    console.log(`${passed ? '✅' : '❌'} [Step ${step}] ${description} ${detail ? `(${detail})` : ''}`);
    if (!passed) {
      throw new Error(`Journey step ${step} failed: ${description}. ${detail}`);
    }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // Set student cookie
  const studentUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'student@dreampath.my',
    role: 'student',
  };
  await context.addCookies([
    {
      name: 'dreampath_session',
      value: encodeURIComponent(JSON.stringify(studentUser)),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('   [Browser Console Error]:', msg.text());
    }
  });

  try {
    // 1. Visit /student/resume
    console.log('\n--- Step 1: Accessing Resume Dashboard ---');
    await page.goto('http://localhost:3000/student/resume', { waitUntil: 'networkidle' });
    record('1.1', 'Load /student/resume', page.url().includes('/student/resume'));

    // 2. Open or create a resume
    let editLink = await page.$('a[href^="/student/resume/"]');
    if (!editLink) {
      console.log('No existing resume found, clicking Create New Resume...');
      const createBtn = await page.$('button:has-text("Create New Resume")');
      if (createBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle' }),
          createBtn.click(),
        ]);
      }
    } else {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        editLink.click(),
      ]);
    }

    record('2.1', 'Navigate to Resume Editor', page.url().includes('/student/resume/'));
    const currentUrl = page.url();
    const resumeIdMatch = currentUrl.match(/\/student\/resume\/([a-zA-Z0-9_-]+)/);
    const resumeId = resumeIdMatch ? resumeIdMatch[1] : null;
    record('2.2', 'Extract Resume ID', !!resumeId, `resumeId=${resumeId}`);

    // 3. Open AI Interview Modal
    console.log('\n--- Step 2: Opening AI Interview Modal ---');
    const aiInterviewBtn = await page.waitForSelector('button:has-text("AI Career Assistant"), button:has-text("AI Interview")', { timeout: 10000 });
    record('3.1', 'AI Interview trigger button exists', !!aiInterviewBtn);
    await aiInterviewBtn.click();

    // 4. Modal is visible and shows greeting
    const modal = await page.waitForSelector('text="Resume AI Assistant"', { timeout: 10000 });
    record('4.1', 'AI Interview modal opened', !!modal);

    // Wait for initial greeting and loading to complete
    await page.waitForTimeout(1000);
    const initialAiMessage = await page.waitForSelector('text=What are you currently studying', { timeout: 10000 });
    record('4.2', 'Initial greeting message displayed', !!initialAiMessage);

    // Wait until modal input is enabled (isLoading = false)
    const inputField = await page.waitForSelector('input[placeholder*="Type your answer naturally"]:not([disabled])', { timeout: 15000 });

    // 5. Turn 1: Provide Education
    console.log('\n--- Step 3: Turn 1 — Providing Education Facts ---');
    await inputField.fill("I'm studying at UPNM, Bachelor of Computer Science, started 2025, CGPA 3.98");
    await page.waitForTimeout(300);
    
    const sendButton = await page.waitForSelector('button:has-text("Send"):not([disabled])', { timeout: 5000 });
    await sendButton.click();

    // Wait for AI response (input becomes re-enabled and loading spinner disappears)
    console.log('Waiting for AI response to Turn 1...');
    await page.waitForSelector('input[placeholder*="Type your answer naturally"]:not([disabled])', { timeout: 15000 });

    // Verify error was NOT triggered
    const errorEl = await page.$('.bg-red-50, .text-red-600');
    record('5.1', 'Turn 1 completed without error banner', !errorEl);

    // Check message content
    const messages = await page.$$eval('.space-y-4 .rounded-2xl', els => els.map(e => e.textContent));
    console.log('Turn 1 Conversation Messages:', messages);
    const latestAiMessage = messages[messages.length - 1] || '';
    
    // Crucial check: AI must NOT have thrown the fallback error message
    const isFalseFallback = latestAiMessage.includes("I understood that! Could you also share any specific achievements, key tools, or milestones from that experience?");
    record('5.2', 'Turn 1 did NOT trigger broken error fallback', !isFalseFallback);
    record('5.3', 'Turn 1 received valid next question', latestAiMessage.length > 10);

    // 6. Turn 2: Declared None on Work Experience
    console.log('\n--- Step 4: Turn 2 — Declared None on Work Experience ---');
    await inputField.fill("I don't have any work experience yet.");
    await page.waitForTimeout(300);
    const sendButtonTurn2 = await page.waitForSelector('button:has-text("Send"):not([disabled])', { timeout: 5000 });
    await sendButtonTurn2.click();

    console.log('Waiting for AI response to Turn 2...');
    await page.waitForSelector('input[placeholder*="Type your answer naturally"]:not([disabled])', { timeout: 15000 });

    const messagesAfterTurn2 = await page.$$eval('.space-y-4 .rounded-2xl', els => els.map(e => e.textContent));
    const latestAiTurn2 = messagesAfterTurn2[messagesAfterTurn2.length - 1] || '';
    console.log('Turn 2 AI Response:', latestAiTurn2);

    record('6.1', 'Turn 2 completed cleanly', latestAiTurn2.length > 10);
    // Planner should proceed to project or skill, NOT ask for experience again
    const asksExpAgain = /work\s+experience|internship|job/i.test(latestAiTurn2) && !/project|campus/i.test(latestAiTurn2);
    record('6.2', 'Planner honored declared_none and moved past work experience', !asksExpAgain);

    // 7. Turn 3: Project Information
    console.log('\n--- Step 5: Turn 3 — Volunteer CampusFind Project ---');
    await inputField.fill("I worked on a project called CampusFind, where I was the project manager. It is a university lost and found system.");
    await page.waitForTimeout(300);
    const sendButtonTurn3 = await page.waitForSelector('button:has-text("Send"):not([disabled])', { timeout: 5000 });
    await sendButtonTurn3.click();

    console.log('Waiting for AI response to Turn 3...');
    await page.waitForSelector('input[placeholder*="Type your answer naturally"]:not([disabled])', { timeout: 15000 });

    const messagesAfterTurn3 = await page.$$eval('.space-y-4 .rounded-2xl', els => els.map(e => e.textContent));
    const latestAiTurn3 = messagesAfterTurn3[messagesAfterTurn3.length - 1] || '';
    console.log('Turn 3 AI Response:', latestAiTurn3);
    record('7.1', 'Turn 3 completed cleanly', latestAiTurn3.length > 10);

    // 8. Test Resume Synthesis & Save
    console.log('\n--- Step 6: Testing Resume Synthesis & Save ---');
    // If not automatically synthesized yet, click the finish button
    const successBanner = await page.$('text=Your resume has been updated & saved!');
    if (!successBanner) {
      const finishBtn = await page.waitForSelector('button:has-text("Finish & Build Resume Now")', { timeout: 8000 });
      record('8.1', 'Finish & Build Resume Now button available', !!finishBtn);
      await finishBtn.click();
      await page.waitForSelector('text=Your resume has been updated & saved!', { timeout: 15000 });
    } else {
      record('8.1', 'Automatic synthesis completed on plan finish', true);
    }

    record('8.2', 'Resume synthesized and saved banner displayed', true);

    // Click "View in Editor" button on the banner
    const viewInEditorBtn = await page.waitForSelector('button:has-text("View in Editor")');
    await viewInEditorBtn.click();
    await page.waitForTimeout(500);

    // Verify education appears in editor
    const pageText = await page.textContent('body');
    const hasUPNM = pageText.includes('UPNM') || pageText.includes('Universiti Pertahanan');
    record('8.3', 'Synthesized education appears in resume editor', hasUPNM);

    // Check that no console database errors were logged during the session
    const dbErrors = consoleErrors.filter(err => err.includes('relation') || err.includes('interview_') || err.includes('syntax error'));
    record('9.1', 'Zero database relation / persistence errors logged', dbErrors.length === 0, `errors=${dbErrors.join('; ')}`);

    console.log('\n=========================================');
    console.log('🎉 RESUME AI INTERVIEW FULL BROWSER AUDIT PASSED!');
    console.log('=========================================\n');
  } finally {
    await browser.close();
  }
}

runInterviewJourneyAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
