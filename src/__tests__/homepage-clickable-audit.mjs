import { chromium } from 'playwright';

async function runClickableAudit() {
  console.log('🚀 Starting Comprehensive Clickable Navigation Audit...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ BROWSER CONSOLE ERROR:', msg.text());
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('❌ BROWSER UNCAUGHT ERROR:', err.message);
    consoleErrors.push(err.message);
  });

  const auditReport = [];

  function record(category, element, action, expected, actual, passed) {
    auditReport.push({
      Category: category,
      Element: element,
      Action: action,
      Expected: expected,
      Actual: actual,
      Status: passed ? '✅ PASS' : '❌ FAIL',
    });
    console.log(`${passed ? '✅' : '❌'} [${category}] ${element}: ${actual}`);
    if (!passed) {
      throw new Error(`Audit failed on [${category}] ${element}: Expected "${expected}", got "${actual}"`);
    }
  }

  try {
    // Navigate to homepage
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // ==========================================
    // 1. HEADER CLEANUP & NON-WRAPPING AUDIT
    // ==========================================
    console.log('\n--- 1. Header Cleanup & Layout Audit ---');

    // 1.1 Notification icon absent
    const notifBell = await page.$('header .lucide-bell, header [aria-label*="notification" i]');
    record('Header', 'Notification/Bell Icon', 'Check absence', 'null', String(notifBell), notifBell === null);

    // 1.2 Search bar absent from header
    const headerSearch = await page.$('header input[type="text"], header button:has-text("Search")');
    record('Header', 'Search Bar in Header', 'Check absence', 'null', String(headerSearch), headerSearch === null);

    // 1.3 Student Portal button absent
    const studentPortalBtn = await page.$('header a:has-text("Student Portal"), header button:has-text("Student Portal")');
    record('Header', 'Student Portal Button', 'Check absence', 'null', String(studentPortalBtn), studentPortalBtn === null);

    // 1.4 Login exists
    const loginLink = await page.$('header a:has-text("Log in")');
    record('Header', 'Log in Button', 'Check presence', 'Element exists', loginLink ? 'Found' : 'Not found', loginLink !== null);

    // 1.5 Sign Up exists
    const signUpLink = await page.$('header a:has-text("Sign Up")');
    record('Header', 'Sign Up Button', 'Check presence', 'Element exists', signUpLink ? 'Found' : 'Not found', signUpLink !== null);

    // 1.6 Verify navigation labels do NOT wrap (height check on all nav links)
    const navLinks = await page.$$('header nav a');
    let allSingleLine = true;
    for (const link of navLinks) {
      const box = await link.boundingBox();
      const text = await link.innerText();
      // Single line text should be <= 34px tall including vertical padding
      if (box && box.height > 34) {
        allSingleLine = false;
        console.warn(`Nav link wrapped: "${text}" has height ${box.height}px`);
      }
    }
    record('Header', 'Nav Links Non-Wrapping', 'Check single-line rendering', 'height <= 34px for all links', allSingleLine ? 'All single line' : 'Some wrapped', allSingleLine);

    // 1.7 Test Header Links Navigation
    const headerTests = [
      { text: 'Scholarships', targetPath: '/scholarships', selector: 'header nav a[href="/scholarships"]' },
      { text: 'Eligibility Engine', targetPath: '/scholarships', selector: 'header nav a:has-text("Eligibility Engine")' },
      { text: 'Tracker & Tools', targetPath: '/student/applications', selector: 'header nav a[href="/student/applications"]', allowsLoginRedirect: true },
      { text: 'About', targetPath: '/about', selector: 'header nav a[href="/about"]' },
      { text: 'Log in', targetPath: '/login', selector: 'header a[href="/login"]' },
      { text: 'Sign Up', targetPath: '/register', selector: 'header a[href="/register"]' },
    ];

    for (const item of headerTests) {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      const link = page.locator(item.selector).first();
      await Promise.all([
        page.waitForURL(url => url.pathname === item.targetPath || url.pathname.includes(item.targetPath) || (item.allowsLoginRedirect && url.pathname === '/login'), { timeout: 8000 }),
        link.click()
      ]);
      const url = new URL(page.url()).pathname;
      const passed = url === item.targetPath || url.includes(item.targetPath) || (item.allowsLoginRedirect && url === '/login');
      record('Header', `Link "${item.text}"`, 'Click and check route', item.targetPath, url, passed);
    }

    // 1.8 Test "How It Works" anchor link
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const howItWorksLink = page.locator('header nav a:has-text("How It Works")');
    await howItWorksLink.click();
    await page.waitForTimeout(400);
    const scrolledArchitectureVisible = await page.locator('#architecture').isVisible();
    record('Header', 'Link "How It Works"', 'Click and check anchor scroll', '#architecture is visible', scrolledArchitectureVisible ? 'Visible' : 'Hidden', scrolledArchitectureVisible);

    // ==========================================
    // 2. HERO SECTION & SCREENER AUDIT
    // ==========================================
    console.log('\n--- 2. Hero Section & Screener Audit ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // 2.1 Hero CTA 1: "Check My Eligibility, Free"
    const heroCheckBtn = page.locator('section').first().locator('a:has-text("Check My Eligibility, Free")');
    await Promise.all([
      page.waitForURL(url => url.pathname === '/scholarships', { timeout: 8000 }),
      heroCheckBtn.click()
    ]);
    const heroCheckUrl = new URL(page.url()).pathname;
    record('Hero', 'Check My Eligibility, Free', 'Click primary hero CTA', '/scholarships', heroCheckUrl, heroCheckUrl === '/scholarships');

    // 2.2 Hero CTA 2: "Browse 27 Verified Programs"
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const heroBrowseBtn = page.locator('section').first().locator('a:has-text("Browse 27 Verified Programs")');
    await Promise.all([
      page.waitForURL(url => url.pathname === '/scholarships', { timeout: 8000 }),
      heroBrowseBtn.click()
    ]);
    const heroBrowseUrl = new URL(page.url()).pathname;
    record('Hero', 'Browse 27 Verified Programs', 'Click secondary hero CTA', '/scholarships', heroBrowseUrl, heroBrowseUrl === '/scholarships');

    // 2.3 Screener Form Selectors & Reactivity
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const matchPill = page.locator('#pre-screen .bg-emerald-50\\/90');
    const initialText = await matchPill.textContent();

    // Select SPM
    await page.selectOption('#qualification', 'spm');
    await page.waitForTimeout(300);
    const spmText = await matchPill.textContent();
    const countChanged = initialText !== spmText;
    record('Hero Screener', 'Qualification Selector', 'Change to SPM', 'Match count updates dynamically', spmText?.trim(), countChanged);

    // Click "Evaluate Full Criteria Matches"
    const evaluateBtn = page.locator('#pre-screen a:has-text("Evaluate Full Criteria Matches")');
    await Promise.all([
      page.waitForURL(url => url.pathname.includes('/scholarships'), { timeout: 8000 }),
      evaluateBtn.click()
    ]);
    const evalUrl = page.url();
    record('Hero Screener', 'Evaluate Full Criteria Matches', 'Click evaluate CTA', 'Navigates to /scholarships?level=SPM', evalUrl, evalUrl.includes('/scholarships?level=SPM'));

    // ==========================================
    // 3. FEATURED SCHOLARSHIPS CATALOG AUDIT
    // ==========================================
    console.log('\n--- 3. Featured Scholarships Catalog Audit ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // 3.1 Filter Pill Tabs
    const filterTabs = [
      { name: 'SPM / Foundation', expectedMin: 1 },
      { name: 'B40 Priority', expectedMin: 1 },
      { name: 'Undergraduate Degree', expectedMin: 1 },
      { name: 'All Programs', expectedMin: 1 },
    ];
    for (const tab of filterTabs) {
      const tabBtn = page.locator(`#scholarship-catalog button:has-text("${tab.name}")`);
      await tabBtn.click();
      await page.waitForTimeout(200);
      const cardsCount = await page.locator('#scholarship-catalog .grid > div').count();
      record('Catalog', `Filter Tab "${tab.name}"`, 'Click filter tab', `Cards rendered >= ${tab.expectedMin}`, `${cardsCount} cards rendered`, cardsCount >= tab.expectedMin);
    }

    // 3.2 Search Input Filtering
    const searchInput = page.locator('#scholarship-catalog input[placeholder*="Filter by keyword"]');
    await searchInput.fill('Bank Rakyat');
    await page.waitForTimeout(300);
    const bankRakyatCard = await page.locator('#scholarship-catalog .grid > div').first().innerText();
    const matchesSearch = bankRakyatCard.includes('Bank Rakyat') || bankRakyatCard.includes('PPBU');
    record('Catalog', 'Search Filter', 'Type "Bank Rakyat"', 'Displays Bank Rakyat card', matchesSearch ? 'Found' : 'Not found', matchesSearch);
    await searchInput.fill('');
    await page.waitForTimeout(200);

    // 3.3 Card "Check Eligibility" -> Policy Mapping Modal -> Full Check
    const firstCardCheckBtn = page.locator('#scholarship-catalog button:has-text("Check Eligibility")').first();
    await firstCardCheckBtn.scrollIntoViewIfNeeded();
    await firstCardCheckBtn.click();
    await page.waitForSelector('[role="dialog"]');
    const modalVisible = await page.locator('[role="dialog"]').isVisible();
    record('Catalog', 'Check Eligibility Button', 'Click to open policy mapping modal', 'Modal visible', modalVisible ? 'Visible' : 'Hidden', modalVisible);

    // In modal: click "Run Complete Deterministic Check"
    const runCheckLink = page.locator('[role="dialog"] a:has-text("Run Complete Deterministic Check")');
    await Promise.all([
      page.waitForURL(url => url.pathname.includes('/check'), { timeout: 8000 }),
      runCheckLink.click()
    ]);
    const checkPageUrl = page.url();
    record('Catalog Modal', 'Run Complete Deterministic Check', 'Navigate to deterministic check', 'URL matches /scholarships/[id]/check', checkPageUrl, checkPageUrl.includes('/scholarships/') && checkPageUrl.includes('/check'));

    // 3.4 Card "Details" link
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const firstDetailsLink = page.locator('#scholarship-catalog a:has-text("Details")').first();
    await firstDetailsLink.scrollIntoViewIfNeeded();
    const detailsHref = await firstDetailsLink.getAttribute('href');
    await Promise.all([
      page.waitForURL(url => url.pathname.includes(detailsHref), { timeout: 8000 }),
      firstDetailsLink.click()
    ]);
    const detailsUrl = page.url();
    record('Catalog Card', 'Details Link', 'Click details link', detailsHref, detailsUrl, detailsUrl.includes(detailsHref));

    // 3.5 Card Bookmark / Save button
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const bookmarkBtn = page.locator('#scholarship-catalog button[aria-label*="Save"]').first();
    await bookmarkBtn.scrollIntoViewIfNeeded();
    await bookmarkBtn.click();
    await page.waitForTimeout(200);
    const savedStorage = await page.evaluate(() => localStorage.getItem('dreampath_saved_scholarships'));
    record('Catalog Card', 'Bookmark Button', 'Click save button', 'Local storage updated', savedStorage, Boolean(savedStorage && savedStorage.length > 2));
    await page.evaluate(() => localStorage.clear());

    // 3.6 "Browse All 27 Verified Scholarships" CTA
    const browseAllBtn = page.locator('#scholarship-catalog a:has-text("Browse All 27 Verified Scholarships")');
    await browseAllBtn.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(url => url.pathname === '/scholarships', { timeout: 8000 }),
      browseAllBtn.click()
    ]);
    const browseAllUrl = new URL(page.url()).pathname;
    record('Catalog', 'Browse All 27 Verified Scholarships CTA', 'Click bottom catalog button', '/scholarships', browseAllUrl, browseAllUrl === '/scholarships');

    // ==========================================
    // 4. PLATFORM FEATURES SECTION AUDIT
    // ==========================================
    console.log('\n--- 4. Platform Features Section Audit ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    const featureTests = [
      { text: 'Check Eligibility Rules', expectedPath: '/scholarships' },
      { text: 'Open Application Tracker', expectedPath: '/student/applications', allowsLoginRedirect: true },
      { text: 'Start Career Interview', expectedPath: '/student/resume', allowsLoginRedirect: true },
      { text: 'Build Scholarship Resume', expectedPath: '/student/resume', allowsLoginRedirect: true },
    ];

    for (const f of featureTests) {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      const fLink = page.locator(`#platform-features a:has-text("${f.text}")`);
      await fLink.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(url => url.pathname === f.expectedPath || (f.allowsLoginRedirect && url.pathname === '/login'), { timeout: 8000 }),
        fLink.click()
      ]);
      const fUrl = new URL(page.url()).pathname;
      const passed = fUrl === f.expectedPath || fUrl.includes(f.expectedPath) || (f.allowsLoginRedirect && fUrl === '/login');
      record('Platform Features', `Feature link "${f.text}"`, 'Click feature action', f.expectedPath, fUrl, passed);
    }

    // ==========================================
    // 5. FAQ ACCORDION AUDIT
    // ==========================================
    console.log('\n--- 5. FAQ Accordion Audit ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Question 1 open by default
    const q1Details = page.locator('#faq-section details').first();
    const q1IsOpenInitial = await q1Details.getAttribute('open');
    record('FAQ', 'Question 1 Default State', 'Check initial open state', 'open attribute present', q1IsOpenInitial !== null ? 'Open' : 'Closed', q1IsOpenInitial !== null);

    // Toggle Question 2
    const q2Summary = page.locator('#faq-section details').nth(1).locator('summary');
    await q2Summary.scrollIntoViewIfNeeded();
    await q2Summary.click();
    await page.waitForTimeout(200);
    const q2IsOpen = await page.locator('#faq-section details').nth(1).getAttribute('open');
    record('FAQ', 'Question 2 Toggle', 'Click summary to expand', 'open attribute present', q2IsOpen !== null ? 'Expanded' : 'Closed', q2IsOpen !== null);

    // ==========================================
    // 6. PRE-FOOTER CONVERSION BAND AUDIT
    // ==========================================
    console.log('\n--- 6. Pre-Footer Conversion Band Audit ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Pre-Footer CTA 1: "Check Your Eligibility, Free"
    const preFooterCheck = page.locator('section:has-text("Ready to find your path?") a:has-text("Check Your Eligibility, Free")');
    await preFooterCheck.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(url => url.pathname === '/scholarships', { timeout: 8000 }),
      preFooterCheck.click()
    ]);
    const preFooterCheckUrl = new URL(page.url()).pathname;
    record('Pre-Footer', 'Check Your Eligibility, Free', 'Click pre-footer primary CTA', '/scholarships', preFooterCheckUrl, preFooterCheckUrl === '/scholarships');

    // Pre-Footer CTA 2: "Explore Full Directory"
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const preFooterExplore = page.locator('section:has-text("Ready to find your path?") a:has-text("Explore Full Directory")');
    await preFooterExplore.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(url => url.pathname === '/scholarships', { timeout: 8000 }),
      preFooterExplore.click()
    ]);
    const preFooterExploreUrl = new URL(page.url()).pathname;
    record('Pre-Footer', 'Explore Full Directory', 'Click pre-footer secondary CTA', '/scholarships', preFooterExploreUrl, preFooterExploreUrl === '/scholarships');

    // ==========================================
    // 7. FOOTER AUDIT
    // ==========================================
    console.log('\n--- 7. Footer Links Audit ---');
    const footerLinks = [
      { text: 'Scholarships', targetPath: '/scholarships' },
      { text: 'Compare', targetPath: '/scholarships/compare' },
      { text: 'About DreamPath', targetPath: '/about' },
      { text: 'Privacy Policy', targetPath: '/privacy' },
      { text: 'Terms of Use', targetPath: '/terms' },
    ];

    for (const fLink of footerLinks) {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      const link = page.locator(`footer nav a:has-text("${fLink.text}")`);
      await link.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(url => url.pathname === fLink.targetPath, { timeout: 8000 }),
        link.click()
      ]);
      const url = new URL(page.url()).pathname;
      record('Footer', `Link "${fLink.text}"`, 'Click and check route', fLink.targetPath, url, url === fLink.targetPath);
    }

    // ==========================================
    // 8. MOBILE DRAWER AUDIT (390px)
    // ==========================================
    console.log('\n--- 8. Mobile Drawer Navigation Audit (390px) ---');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Open mobile menu
    const menuBtn = page.locator('header button[aria-label="Toggle navigation menu"]');
    await menuBtn.click();
    await page.waitForSelector('#mobile-menu');
    const mobileMenuOpen = await page.locator('#mobile-menu').isVisible();
    record('Mobile Menu', 'Hamburger Button', 'Click to open drawer', 'Drawer visible', mobileMenuOpen ? 'Visible' : 'Hidden', mobileMenuOpen);

    // Click "Scholarships" in drawer
    const drawerScholarships = page.locator('#mobile-menu a:has-text("Scholarships")');
    await Promise.all([
      page.waitForURL(url => url.pathname === '/scholarships', { timeout: 8000 }),
      drawerScholarships.click()
    ]);
    const mobileCatUrl = new URL(page.url()).pathname;
    record('Mobile Menu', 'Drawer Link "Scholarships"', 'Click link in drawer', '/scholarships', mobileCatUrl, mobileCatUrl === '/scholarships');

    // Confirm no uncaught console errors
    console.log('\n--- Console Errors Check ---');
    record('System', 'Console Error Log', 'Verify 0 uncaught client exceptions', '0 errors', `${consoleErrors.length} errors`, consoleErrors.length === 0);

    console.log('\n==========================================================');
    console.log(`🎉 COMPREHENSIVE AUDIT COMPLETE: ${auditReport.length} CHECKS PASSED!`);
    console.log('==========================================================');
    console.table(auditReport);

  } catch (err) {
    console.error('❌ Audit encountered an error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runClickableAudit();
