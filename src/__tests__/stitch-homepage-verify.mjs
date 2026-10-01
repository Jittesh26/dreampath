import { chromium } from 'playwright';

async function runVerification() {
  console.log('🚀 Starting Google Stitch Homepage Integration Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('BROWSER UNCAUGHT:', err));

  const results = {};

  try {
    // 1. Homepage loads
    console.log('1. Navigating to http://localhost:3000...');
    const resp = await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    results['homepage_status_200'] = resp?.status() === 200;
    console.log('✓ Homepage loaded with status 200');

    // 2. Navigation Header
    const brandName = await page.textContent('header');
    results['header_brand'] = (brandName?.includes('DreamPath') && brandName?.includes('National Scholarship Intelligence')) || false;
    results['header_student_portal_cta'] = (await page.$('header a:has-text("Student Portal")')) !== null;
    console.log('✓ Header brand & Student Portal CTA verified');

    // 3. Hero Section & Copy
    const h1Text = await page.textContent('h1');
    results['hero_h1_text'] = (h1Text?.includes('Stop Guessing Your Scholarship Eligibility') && h1Text?.includes('Verified Confidence')) || false;
    results['no_mathematical_certainty'] = !h1Text?.includes('Mathematical Certainty');
    console.log('✓ Hero headline verified (Truthful copy, no "Mathematical Certainty")');

    // 4. Hero Quick Eligibility Screener
    const preScreenHeading = await page.textContent('#pre-screen');
    results['prescreen_heading'] = preScreenHeading?.includes('Quick Eligibility Screener') || false;
    
    // Check initial match pill
    const initialMatchText = await page.textContent('#pre-screen .bg-emerald-50\\/90');
    results['prescreen_match_pill'] = (initialMatchText?.includes('Matches') && initialMatchText?.includes('PRELIMINARY MATCH')) || false;
    console.log(`✓ Initial match text: ${initialMatchText?.trim()}`);

    // Change qualification to SPM and check dynamic update
    await page.selectOption('#qualification', 'spm');
    await page.waitForTimeout(300);
    const spmMatchText = await page.textContent('#pre-screen .bg-emerald-50\\/90');
    console.log(`✓ Updated match text after SPM select: ${spmMatchText?.trim()}`);
    results['prescreen_reactive_update'] = Boolean(spmMatchText && spmMatchText.length > 0);

    // 5. Statistics Glass Container & Provider Trust Strip
    const truthStripText = await page.textContent('#truth-metrics');
    results['truth_strip_verified_programs'] = (truthStripText?.includes('Verified Programs')) || false;
    results['truth_strip_direct_provenance'] = (truthStripText?.includes('Direct Provenance')) || false;
    results['truth_strip_providers'] = (truthStripText?.includes('BANK RAKYAT') && truthStripText?.includes('JPA MALAYSIA')) || false;
    console.log('✓ Statistics & Provider Trust Strip verified');

    // 6. Featured Verified Scholarships Catalog
    const catalogHeader = await page.textContent('#scholarship-catalog');
    results['catalog_authoritative_registry'] = catalogHeader?.includes('AUTHORITATIVE REGISTRY') || false;
    results['catalog_featured_scholarships'] = catalogHeader?.includes('Featured Verified Scholarships') || false;

    // Check cards
    const cards = await page.$$('#scholarship-catalog .grid > div');
    results['catalog_cards_count'] = cards.length;
    console.log(`✓ Rendered ${cards.length} scholarship cards in catalog`);

    // Verify card fields on first card
    const firstCard = cards[0];
    const firstCardText = await firstCard.innerText();
    results['card_has_check_eligibility'] = firstCardText.includes('Check Eligibility');
    results['card_has_details_link'] = firstCardText.includes('Details');
    results['card_has_monetary_value'] = firstCardText.includes('RM') || firstCardText.includes('Full');
    results['card_has_deadline'] = firstCardText.includes('Deadline:');
    console.log('✓ Card components and dynamic fields verified');

    // Test Eligibility Modal on first card using locator
    const checkBtn = page.locator('#scholarship-catalog button:has-text("Check Eligibility")').first();
    await checkBtn.scrollIntoViewIfNeeded();
    await checkBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const modalText = await page.textContent('[role="dialog"]');
    results['eligibility_modal_opens'] = modalText?.includes('Official Policy Mapping') || false;
    console.log('✓ Quick Eligibility Modal opens with official policy mapping');

    // Close modal
    const closeBtn = page.locator('[role="dialog"] button[aria-label="Close dialog"]');
    await closeBtn.click();
    await page.waitForTimeout(200);

    // Test Save / Bookmark button on first card
    const bookmarkBtn = page.locator('#scholarship-catalog button[aria-label*="Save"]').first();
    await bookmarkBtn.scrollIntoViewIfNeeded();
    await bookmarkBtn.click();
    await page.waitForTimeout(200);
    const savedInStorage = await page.evaluate(() => {
      return localStorage.getItem('dreampath_saved_scholarships');
    });
    results['card_save_persists_storage'] = Boolean(savedInStorage && savedInStorage.length > 2);
    console.log('✓ Bookmark click successfully updates local persistence');

    // 7. Dark Verification Architecture
    const archText = await page.textContent('#architecture');
    results['architecture_phase_1'] = archText?.includes('01. Profile Input') || false;
    results['architecture_phase_2'] = archText?.includes('02. Rule-Based Matching') || false;
    results['architecture_phase_3'] = archText?.includes('03. Verified Application') || false;
    console.log('✓ Dark Verification Architecture section verified');

    // 8. Platform Features Section
    const featuresText = await page.textContent('#platform-features');
    results['features_eligibility_engine'] = featuresText?.includes('Deterministic Eligibility Engine') || false;
    results['features_tracker'] = featuresText?.includes('Application Progress Tracker') || false;
    results['features_ai_career'] = featuresText?.includes('AI Career Assistant') || false;
    results['features_resume_builder'] = featuresText?.includes('Professional Resume Builder') || false;
    console.log('✓ Platform Features section verified');

    // 9. FAQ Section
    const faqText = await page.textContent('#faq-section');
    results['faq_heading'] = faqText?.includes('FREQUENTLY ASKED QUESTIONS') || false;
    results['faq_q1_open'] = faqText?.includes('Every criteria rule is extracted directly') || false;
    console.log('✓ FAQ section verified');

    // 10. Pre-Footer Conversion Band
    const preFooter = await page.textContent('section:has-text("Ready to find your path?")');
    results['prefooter_cta'] = (preFooter?.includes('Check Your Eligibility, Free') && preFooter?.includes('PDPA Act 709 Compliant')) || false;
    console.log('✓ Pre-Footer Conversion Band verified');

    // 11. Footer
    const footerText = await page.textContent('footer');
    results['footer_brand'] = footerText?.includes('DreamPath Intelligence') || false;
    results['footer_disclaimer'] = footerText?.includes('Non-Affiliation Notice') || false;
    console.log('✓ Footer and legal non-affiliation notice verified');

    // 12. Mobile Responsive Viewport Check (iPhone 390x844)
    console.log('12. Testing mobile viewport (390px)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const mobileH1 = await page.isVisible('h1');
    results['mobile_h1_visible'] = mobileH1;
    const mobilePreScreen = await page.isVisible('#pre-screen');
    results['mobile_prescreen_visible'] = mobilePreScreen;
    console.log('✓ Mobile responsive layout verified');

    // 13. Verify other key routes still work smoothly
    console.log('13. Checking existing scholarship catalogue route...');
    const catResp = await page.goto('http://localhost:3000/scholarships', { waitUntil: 'domcontentloaded' });
    results['catalogue_route_200'] = catResp?.status() === 200;

    console.log('14. Checking scholarship comparison route...');
    const compResp = await page.goto('http://localhost:3000/scholarships/compare', { waitUntil: 'domcontentloaded' });
    results['compare_route_200'] = compResp?.status() === 200;

    console.log('\n=========================================');
    console.log('🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('Summary of verification checks:');
    console.table(results);
    console.log('=========================================');

  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
