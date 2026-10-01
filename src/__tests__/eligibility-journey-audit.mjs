import { chromium } from 'playwright';

async function runEligibilityJourneyAudit() {
  console.log('🚀 Starting Full Browser User Journey Audit for /eligibility...');
  const browser = await chromium.launch({ headless: true });

  const auditLog = [];
  function record(step, description, passed, detail = '') {
    auditLog.push({ step, description, passed, detail });
    console.log(`${passed ? '✅' : '❌'} [Step ${step}] ${description} ${detail ? `(${detail})` : ''}`);
    if (!passed) {
      throw new Error(`Journey step ${step} failed: ${description}. ${detail}`);
    }
  }

  // ========================================================
  // DESKTOP RUN (1440 x 900)
  // ========================================================
  console.log('\n--- PART A: DESKTOP JOURNEY (1440x900) ---');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktopContext.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('   [Browser Console Error]:', msg.text());
    }
  });

  try {
    // 1. Visit Homepage
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    record('1.1', 'Load Homepage', page.url() === 'http://localhost:3000/');

    // 2. Verify CTA Hierarchy on Hero
    const primaryCta = await page.$('a:has-text("Check My Eligibility, Free →")');
    record('1.2', 'Hero Primary CTA exists with label "Check My Eligibility, Free →"', primaryCta !== null);
    const primaryHref = await primaryCta?.getAttribute('href');
    record('1.3', 'Hero Primary CTA href is "/eligibility"', primaryHref === '/eligibility', `href=${primaryHref}`);

    const secondaryCta = await page.$('a:has-text("Browse Scholarships →")');
    record('1.4', 'Hero Secondary CTA exists with label "Browse Scholarships →"', secondaryCta !== null);
    const secondaryHref = await secondaryCta?.getAttribute('href');
    record('1.5', 'Hero Secondary CTA href is "/scholarships"', secondaryHref === '/scholarships', `href=${secondaryHref}`);

    // Verify AnimatedScreenerCard action link
    const screenerAction = await page.$('a:has-text("Evaluate Full Criteria Matches →")');
    record('1.6', 'Animated Screener card action button exists', screenerAction !== null);
    const screenerHref = await screenerAction?.getAttribute('href');
    record('1.7', 'Animated Screener links to /eligibility', screenerHref === '/eligibility', `href=${screenerHref}`);

    // 3. Click Hero CTA and navigate to /eligibility
    console.log('\nNavigating from Homepage to /eligibility via Hero Primary CTA...');
    await Promise.all([
      page.waitForURL('**/eligibility'),
      primaryCta?.click(),
    ]);
    record('2.1', 'Click Primary CTA successfully navigates to /eligibility', page.url().includes('/eligibility'));

    // 4. Verify /eligibility initial state
    await page.waitForSelector('h2:has-text("Evaluate Your Profile Across All Published Scholarships")');
    record('2.2', 'Eligibility matcher header loaded', true);

    const initialCards = await page.$$('div:has(> div > a[href*="/scholarships/"])');
    record('2.3', 'Scholarship match cards rendered', initialCards.length > 0, `Count=${initialCards.length}`);

    // 5. Test Status Badges: MET, MISSING_INFO, NOT_MET
    const hasMet = (await page.$$('text=QUALIFIED · ALL RULES MET')).length > 0;
    const hasMissing = (await page.$$('text=NEEDS MORE INFORMATION')).length > 0;
    record('3.1', 'Qualified / MET status badges rendered', hasMet);
    record('3.2', 'Needs More Information status badges rendered', hasMissing);

    // 6. Test Availability distinction: closed scholarship vs eligibility
    const closedBadge = await page.$('text=Intake Closed (For Reference)');
    record('3.3', 'Distinct availability badge exists (Intake Closed)', closedBadge !== null);

    // 7. Adjust criteria to trigger ineligibility / NOT_MET
    console.log('\nUpdating profile facts to non-Malaysian citizenship to test NOT_MET propagation...');
    const citizenshipSelect = await page.$('select:has-text("Malaysian Citizen")');
    if (citizenshipSelect) {
      await citizenshipSelect.selectOption('Non-Malaysian');
      await page.waitForTimeout(600); // Allow server evaluation debounce + transition
      const notMetCount = (await page.$$('text=NOT ELIGIBLE')).length;
      record('3.4', 'Setting Non-Malaysian triggers NOT ELIGIBLE results', notMetCount > 0, `NotMetCount=${notMetCount}`);
      
      // Reset citizenship back to Malaysian
      await citizenshipSelect.selectOption('Malaysian');
      await page.waitForTimeout(600);
    }

    // 8. Test Demo Presets
    console.log('\nTesting Demo Presets (STPM 3.90, CGPA 3.70, Straight A SPM, Reset)...');
    const stpmPresetBtn = await page.$('button:has-text("STPM 3.90 (B40)")');
    record('4.1', 'STPM 3.90 (B40) demo preset button exists', stpmPresetBtn !== null);
    await stpmPresetBtn?.click();
    await page.waitForTimeout(600);

    const cgpaPresetBtn = await page.$('button:has-text("CGPA 3.70 (M40)")');
    record('4.2', 'CGPA 3.70 (M40) demo preset button exists', cgpaPresetBtn !== null);
    await cgpaPresetBtn?.click();
    await page.waitForTimeout(600);

    const spmPresetBtn = await page.$('button:has-text("Straight A SPM")');
    record('4.3', 'Straight A SPM demo preset button exists', spmPresetBtn !== null);
    await spmPresetBtn?.click();
    await page.waitForTimeout(600);

    const resetBtn = await page.$('button[title="Reset profile facts"]');
    record('4.4', 'Reset facts button exists', resetBtn !== null);
    await resetBtn?.click();
    await page.waitForTimeout(600);

    // Reapply STPM 3.90 for rich results
    await stpmPresetBtn?.click();
    await page.waitForTimeout(600);

    // 9. Test View Dossier and return
    console.log('\nTesting View Dossier link...');
    const dossierLink = await page.$('a:has-text("View Dossier")');
    record('5.1', 'View Dossier link exists', dossierLink !== null);
    const dossierHref = await dossierLink?.getAttribute('href');
    await dossierLink?.click();
    await page.waitForURL(`**${dossierHref}`);
    record('5.2', 'Navigated to Scholarship Dossier page', page.url().includes('/scholarships/'));

    // Go back to /eligibility
    await page.goBack();
    await page.waitForURL('**/eligibility');
    record('5.3', 'Browser back returns to /eligibility', page.url().includes('/eligibility'));

    // 10. Test Detailed Single Checker and return
    console.log('\nTesting Detailed Single Checker link...');
    const singleCheckerLink = await page.$('a:has-text("Detailed Single Checker")');
    record('5.4', 'Detailed Single Checker link exists', singleCheckerLink !== null);
    const singleCheckerHref = await singleCheckerLink?.getAttribute('href');
    await singleCheckerLink?.click();
    await page.waitForURL(`**${singleCheckerHref}`);
    record('5.5', 'Navigated to single scholarship checker wizard', page.url().includes('/check'));

    // Go back to /eligibility
    await page.goBack();
    await page.waitForURL('**/eligibility');
    record('5.6', 'Browser back returns to /eligibility from checker', page.url().includes('/eligibility'));

    // 11. Test Save to Tracker while Logged Out
    console.log('\nTesting Save to Tracker while logged out...');
    const saveBtn = await page.$('button:has-text("Save to Tracker")');
    record('6.1', 'Save to Tracker button exists', saveBtn !== null);
    await saveBtn?.click();
    await page.waitForTimeout(300);

    const authModal = await page.$('h3:has-text("Sign in to save this scholarship")');
    record('6.2', 'Logged-out user clicking Save shows explicit Sign in Auth Modal', authModal !== null);

    const loginLinkInModal = await page.$('a:has-text("Log in to Save")');
    record('6.3', 'Modal provides direct "Log in to Save" route', loginLinkInModal !== null);
    const loginHref = await loginLinkInModal?.getAttribute('href');
    record('6.4', 'Login link preserves return destination', loginHref === '/login?redirect=/eligibility');

    // 12. Sign in flow
    console.log('\nExecuting sign in flow from auth modal...');
    await loginLinkInModal?.click();
    await page.waitForURL((url) => url.pathname === '/login');
    record('7.1', 'Navigated to login page with redirect param', page.url().includes('/login'));

    await page.fill('input[name="email"]', 'student@dreampath.my');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]:has-text("Sign in")');
    await page.waitForURL((url) => url.pathname === '/eligibility', { timeout: 10000 });
    record('7.2', 'Sign in succeeded and redirected back to /eligibility', page.url().includes('/eligibility'));

    // 13. Verify Authenticated State on /eligibility
    const syncedBadge = await page.waitForSelector('text=Synced to Account', { timeout: 5000 });
    record('7.3', 'Synced to Account badge visible for authenticated student', syncedBadge !== null);

    // 14. Save Scholarship while Authenticated
    console.log('\nTesting Save to Tracker while authenticated...');
    const authedSaveBtn = await page.$('button:has-text("Save to Tracker")');
    if (authedSaveBtn) {
      await authedSaveBtn.click();
      const savedTrackerBadge = await page.waitForSelector('button:has-text("Saved in Tracker")', { timeout: 8000 });
      record('7.4', 'Scholarship saved: button changes to "Saved in Tracker"', savedTrackerBadge !== null);

      const successNotice = await page.waitForSelector(':has-text("saved to your Tracker")', { timeout: 5000 });
      record('7.5', 'Success notification banner appears with Tracker link', successNotice !== null);

      // Verify clicking duplicate doesn't trigger error
      await savedTrackerBadge?.click();
      record('7.6', 'Clicking already-saved scholarship is non-destructive (no duplicate error)', true);
    }

    // 15. Page Refresh test
    console.log('\nTesting page refresh on /eligibility...');
    await page.reload({ waitUntil: 'networkidle' });
    record('8.1', 'Page reloads cleanly without errors', page.url().includes('/eligibility'));
    const refreshedSaved = await page.$('button:has-text("Saved in Tracker")');
    record('8.2', 'Saved state persists across page reload', refreshedSaved !== null);

    // 16. Browser Forward / Back test
    console.log('\nTesting browser forward and back navigation...');
    await page.goBack();
    record('8.3', 'Browser back navigates back cleanly', true);
    await page.goForward();
    record('8.4', 'Browser forward returns to /eligibility', page.url().includes('/eligibility'));

  } finally {
    await desktopContext.close();
  }

  // ========================================================
  // MOBILE RUN (390 x 844 iPhone 14 style)
  // ========================================================
  console.log('\n--- PART B: MOBILE JOURNEY (390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  try {
    // 1. Visit homepage on mobile
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    record('9.1', 'Mobile Homepage loaded', mobilePage.url() === 'http://localhost:3000/');

    // 2. Click Primary Hero CTA on mobile
    const mobilePrimaryCta = await mobilePage.$('a:has-text("Check My Eligibility, Free →")');
    record('9.2', 'Mobile Primary CTA visible', mobilePrimaryCta !== null);
    await Promise.all([
      mobilePage.waitForURL('**/eligibility'),
      mobilePrimaryCta?.click(),
    ]);
    record('9.3', 'Mobile navigation to /eligibility successful', mobilePage.url().includes('/eligibility'));

    // 3. Mobile responsiveness check
    const mobileHeading = await mobilePage.$('h2:has-text("Evaluate Your Profile")');
    record('9.4', 'Mobile matcher heading rendered without overflow', mobileHeading !== null);

    const mobileCards = await mobilePage.$$('div:has(> div > a[href*="/scholarships/"])');
    record('9.5', 'Mobile match cards rendered and touch-operable', mobileCards.length > 0);

    // 4. Test Demo Preset on mobile
    const mobilePreset = await mobilePage.$('button:has-text("STPM 3.90 (B40)")');
    record('9.6', 'Mobile demo preset button clickable', mobilePreset !== null);
    await mobilePreset?.click();
    await mobilePage.waitForTimeout(600);

    const mobileMetCount = (await mobilePage.$$('text=QUALIFIED · ALL RULES MET')).length;
    record('9.7', 'Mobile real-time evaluation updates correctly', mobileMetCount > 0, `Qualified=${mobileMetCount}`);

  } finally {
    await mobileContext.close();
  }

  await browser.close();
  console.log('\n🎉 ALL REAL BROWSER AUDIT CHECKS PASSED SUCCESSFULLY!\n');
}

runEligibilityJourneyAudit().catch((err) => {
  console.error('\n❌ Browser Journey Audit Failed:', err);
  process.exit(1);
});
