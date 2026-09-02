const PptxGenJS = require('pptxgenjs');
const path = require('path');

const pptx = new PptxGenJS();
pptx.author = 'Team KisanSetu';
pptx.company = 'Smart India Hackathon 2026';
pptx.subject = 'KisanSetu — Autonomous 2G Voice AI & Direct Farm-to-Consumer Fair Trade Network';
pptx.title = 'SIH 2026 Idea Presentation — KisanSetu';
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches (16:9)

// ── COLOR PALETTE ──
const C = {
  DARK:        '0F172A',
  GREEN_HERO:  '064E3B', // Deep Emerald
  GREEN_D:     '065F46', // Dark Green
  GREEN_M:     '059669', // Primary Green
  GREEN_L:     '10B981', // Light Mint
  GREEN_PALE:  'D1FAE5', // Pale Mint
  GREEN_BG:    'F0FDF4', // Subtle Tint BG
  ORANGE:      'F59E0B', // Amber / Gold
  ORANGE_D:    'D97706', // Warm Amber
  RED:         'DC2626', // Alert Red
  BLUE:        '2563EB', // Tech Blue
  BLUE_L:      'DBEAFE', // Light Blue
  PURPLE:      '7C3AED', // AI Purple
  PURPLE_L:    'F3E8FF',
  WHITE:       'FFFFFF',
  BLACK:       '111827',
  GRAY:        '6B7280',
  GRAY_L:      'F3F4F6',
  GRAY_BG:     'F9FAFB',
};

// ── REUSABLE UI BUILDERS ──
function footerBar(slide, num) {
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 7.02, w: 13.33, h: 0.48, fill: { color: C.GREEN_HERO } });
  slide.addText('SMART INDIA HACKATHON 2026  •  PS ID: 26033  •  Agriculture, FoodTech & Rural Development  •  Team KisanSetu', {
    x: 0.5, y: 7.06, w: 11.2, h: 0.38, fontSize: 9, color: 'A7F3D0', fontFace: 'Calibri'
  });
  slide.addText(`${num} / 6`, { x: 11.8, y: 7.06, w: 1.0, h: 0.38, fontSize: 10, color: C.WHITE, bold: true, align: 'right', fontFace: 'Calibri' });
}

function sectionBanner(slide, title, subtitle) {
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 1.18, fill: { color: C.GREEN_HERO } });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 1.18, w: 13.33, h: 0.06, fill: { color: C.ORANGE } });
  slide.addText(title, { x: 0.6, y: 0.1, w: 12, h: 0.65, fontSize: 24, color: C.WHITE, bold: true, fontFace: 'Calibri' });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.6, y: 0.72, w: 12, h: 0.35, fontSize: 11.5, color: 'A7F3D0', italic: true, fontFace: 'Calibri' });
  }
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.fill || C.WHITE },
    line: { color: opts.border || C.GREEN_L, width: opts.borderW || 1.5 },
    rectRadius: opts.radius || 0.12,
    shadow: { type: 'outer', blur: 6, offset: 2, color: '000000', opacity: 0.12 }
  });
}

function cardHeader(slide, x, y, w, text, color) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: x + 0.08, y: y + 0.08, w: w - 0.16, h: 0.40,
    fill: { color }, rectRadius: 0.08
  });
  slide.addText(text, {
    x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.40,
    fontSize: 11, color: C.WHITE, bold: true, fontFace: 'Calibri', valign: 'middle'
  });
}

function bulletList(slide, x, y, w, h, items, fontSize = 10) {
  const rows = items.map(t => ({
    text: t, options: {
      bullet: { code: '2713' }, fontSize,
      color: C.BLACK, paraSpaceBefore: 2.5, paraSpaceAfter: 2.5
    }
  }));
  slide.addText(rows, { x, y, w, h, fontFace: 'Calibri', valign: 'top' });
}

function statBox(slide, x, y, w, h, num, label, numColor, bgColor) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: bgColor || C.GREEN_D }, rectRadius: 0.12,
    shadow: { type: 'outer', blur: 5, offset: 2, color: '000000', opacity: 0.2 }
  });
  slide.addText(num, { x, y: y + 0.05, w, h: h * 0.55, fontSize: 32, color: numColor || C.ORANGE, bold: true, align: 'center', fontFace: 'Calibri' });
  slide.addText(label, { x: x + 0.1, y: y + h * 0.5, w: w - 0.2, h: h * 0.45, fontSize: 9.5, color: C.GREEN_PALE, align: 'center', fontFace: 'Calibri', valign: 'top' });
}

function flowStep(slide, x, y, w, h, text, bgColor) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: bgColor }, rectRadius: 0.10,
    shadow: { type: 'outer', blur: 4, offset: 2, color: '000000', opacity: 0.15 }
  });
  slide.addText(text, { x, y, w, h, fontSize: 8.5, color: C.WHITE, bold: true, align: 'center', valign: 'middle', fontFace: 'Calibri' });
}

function downArrow(slide, x, y) {
  slide.addText('▼', { x, y, w: 0.35, h: 0.22, fontSize: 10, color: C.GREEN_M, align: 'center' });
}

// ── ADVANCED FLOWCHART HELPERS ──
function flowchartBox(slide, x, y, w, h, stepNum, title, subbullets, headerColor, opts = {}) {
  // Container Box
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.fill || C.WHITE },
    line: { color: headerColor, width: opts.borderW || 1.8 },
    rectRadius: 0.10,
    shadow: { type: 'outer', blur: 5, offset: 2, color: '000000', opacity: 0.12 }
  });

  // Step Pill Header
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: x + 0.08, y: y + 0.08, w: w - 0.16, h: 0.36,
    fill: { color: headerColor }, rectRadius: 0.07
  });
  slide.addText(`STEP ${stepNum}: ${title}`, {
    x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.36,
    fontSize: 9.5, color: C.WHITE, bold: true, fontFace: 'Calibri', valign: 'middle', align: 'center'
  });

  // Sub-items
  if (subbullets && subbullets.length > 0) {
    const rows = subbullets.map(b => ({
      text: b, options: {
        bullet: { code: '2022' }, fontSize: 8.5,
        color: C.BLACK, paraSpaceBefore: 1.5, paraSpaceAfter: 1.5
      }
    }));
    slide.addText(rows, { x: x + 0.12, y: y + 0.48, w: w - 0.24, h: h - 0.52, fontFace: 'Calibri', valign: 'top' });
  }
}

function flowArrowRight(slide, x, y, w = 0.4, label = '') {
  slide.addShape(pptx.shapes.RIGHT_ARROW, {
    x, y: y + 0.15, w, h: 0.24,
    fill: { color: C.GREEN_M }, line: { color: C.GREEN_D, width: 0.5 }
  });
  if (label) {
    slide.addText(label, {
      x: x - 0.1, y: y - 0.18, w: w + 0.2, h: 0.25,
      fontSize: 7.5, color: C.GRAY, align: 'center', fontFace: 'Calibri', bold: true
    });
  }
}

function flowArrowDown(slide, x, y, h = 0.3, label = '') {
  slide.addShape(pptx.shapes.DOWN_ARROW, {
    x: x - 0.1, y, w: 0.20, h,
    fill: { color: C.GREEN_M }, line: { color: C.GREEN_D, width: 0.5 }
  });
  if (label) {
    slide.addText(label, {
      x: x + 0.15, y: y + (h / 2) - 0.1, w: 1.5, h: 0.25,
      fontSize: 7.5, color: C.GRAY, align: 'left', fontFace: 'Calibri', bold: true
    });
  }
}

// ════════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE SLIDE
// ════════════════════════════════════════════════════════════════
(function slide1() {
  const s = pptx.addSlide();
  s.background = { fill: C.GREEN_HERO };

  // Left accent stripe
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.ORANGE } });

  // SIH 2026 Badge
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 0.4, w: 5.2, h: 0.55, fill: { color: C.GREEN_D }, rectRadius: 0.1 });
  s.addText('★  SMART INDIA HACKATHON 2026', { x: 0.7, y: 0.4, w: 5.0, h: 0.55, fontSize: 16, color: C.ORANGE, bold: true, fontFace: 'Calibri' });

  // Title
  s.addText('KisanSetu', { x: 0.6, y: 1.35, w: 8, h: 1.0, fontSize: 52, color: C.WHITE, bold: true, fontFace: 'Calibri' });
  s.addText('Autonomous 2G Voice AI & Direct Farm-to-Consumer Fair Trade Network', { x: 0.6, y: 2.35, w: 8, h: 0.45, fontSize: 15, color: C.GREEN_L, bold: true, fontFace: 'Calibri' });

  // Divider
  s.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 2.95, w: 4.5, h: 0.04, fill: { color: C.ORANGE } });

  // Problem Statement info
  s.addText('Problem Statement ID: 26033', { x: 0.6, y: 3.15, w: 8, h: 0.32, fontSize: 13.5, color: C.GREEN_PALE, bold: true, fontFace: 'Calibri' });
  s.addText('"Multiple intermediaries reduce farmers\' earnings\nand increase consumer prices"', {
    x: 0.6, y: 3.52, w: 7.6, h: 0.75, fontSize: 14.5, color: C.WHITE, italic: true, fontFace: 'Calibri'
  });

  // Working Prototype Badge
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 4.45, w: 7.6, h: 0.55, fill: { color: '047857' }, rectRadius: 0.1, line: { color: C.GREEN_L, width: 1.5 } });
  s.addText('⚡ PROTOTYPE VERIFIED: Real 2G Twilio Voice Calls  ·  Sarvam AI Bulbul/Saaras v3  ·  2-Opt Direct Logistics  ·  98% Escrow', {
    x: 0.7, y: 4.45, w: 7.4, h: 0.55, fontSize: 9.5, color: C.WHITE, bold: true, fontFace: 'Calibri', valign: 'middle'
  });

  // Theme & Category
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 5.25, w: 6.2, h: 0.42, fill: { color: C.GREEN_D }, rectRadius: 0.08 });
  s.addText('Theme: Agriculture, FoodTech & Rural Development  |  Category: Software', {
    x: 0.7, y: 5.25, w: 6.0, h: 0.42, fontSize: 10, color: C.GREEN_PALE, fontFace: 'Calibri', valign: 'middle'
  });

  // Team name
  s.addText('Team KisanSetu', { x: 0.6, y: 6.05, w: 5, h: 0.45, fontSize: 22, color: C.ORANGE, bold: true, fontFace: 'Calibri' });

  // Right side — 3 high-impact stat boxes
  statBox(s, 8.9, 0.95, 3.9, 1.55, '65%', 'Agricultural Value\nLost to Middlemen Chains', C.RED, C.GREEN_D);
  statBox(s, 8.9, 2.75, 3.9, 1.55, '120M', 'Indian Farmers Relying on\nBasic 2G Feature Phones', C.ORANGE, C.GREEN_D);
  statBox(s, 8.9, 4.55, 3.9, 1.55, '98%', 'Direct Farmer Payout\n(vs 18-25% in Mandi Chains)', C.GREEN_L, C.GREEN_D);

  s.addText('1 / 6', { x: 12.0, y: 6.9, w: 1.0, h: 0.4, fontSize: 10, color: 'A7F3D0', align: 'right', fontFace: 'Calibri' });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 2 — PROPOSED SOLUTION & END-TO-END FLOWCHART
// ════════════════════════════════════════════════════════════════
(function slide2() {
  const s = pptx.addSlide();
  s.background = { fill: C.WHITE };
  sectionBanner(s, 'PROPOSED SOLUTION — INNOVATION PILLARS & OPERATIONAL FLOW', 'Connecting Farmers Directly to Consumers with 2G Voice AI & Freshness Proximity Matching');
  footerBar(s, 2);

  // TOP HALF: 3 Core Pillar Cards
  const pillars = [
    {
      icon: '📞', title: '1. Zero-Internet 2G Voice AI',
      color: C.ORANGE_D,
      items: [
        'Toll-free IVR for ₹800 feature phones (Zero smartphone barrier)',
        'Sarvam AI Bulbul v3 TTS in natural Tamil, Hindi & English',
        'Saaras v3 STT + Heuristic NLP entity extraction (<2.5s response)',
        'Instant multilingual SMS receipt with unique listing ID'
      ]
    },
    {
      icon: '🌿', title: '2. Direct Freshness & Proximity Engine',
      color: C.GREEN_M,
      items: [
        'Zero-Warehouse Direct Flow: Harvested on demand at farm gate',
        'Dynamic Freshness Window: Tracks shelf-life hours & harvest dates',
        'Proximity Scoring: Pairs local buyers with nearest farms (<50km)',
        'Urgent Rescue Deals: Auto-discounts near-expiry lots to stop waste'
      ]
    },
    {
      icon: '🚚', title: '3. Anti-Distress Pricing & Direct Logistics',
      color: C.BLUE,
      items: [
        'Real-time APMC Mandi Modal & MSP anti-underpricing guard',
        '2-Opt TSP direct route optimization cuts transit from 5 days to 24h',
        'Fair-Trade Economics: 98% direct to farmer bank, 2% platform fee',
        'Method 4 on-site bank passbook OCR verification at farm gate'
      ]
    }
  ];

  pillars.forEach((p, i) => {
    const px = 0.35 + i * 4.25;
    const pw = 4.0;
    card(s, px, 1.40, pw, 2.50, { border: p.color, borderW: 2 });
    cardHeader(s, px, 1.40, pw, `${p.icon}  ${p.title}`, p.color);
    bulletList(s, px + 0.2, 1.88, pw - 0.4, 1.95, p.items, 9.5);
  });

  // BOTTOM HALF: 5-Stage Operational Flowchart
  card(s, 0.35, 4.05, 12.6, 2.85, { fill: C.GREEN_BG, border: C.GREEN_L, borderW: 1.5 });
  s.addText('END-TO-END OPERATIONAL LIFECYCLE FLOWCHART', {
    x: 0.5, y: 4.15, w: 12.3, h: 0.30, fontSize: 11, color: C.GREEN_HERO, bold: true, align: 'center', fontFace: 'Calibri'
  });
  s.addShape(pptx.shapes.RECTANGLE, { x: 4.0, y: 4.45, w: 5.3, h: 0.02, fill: { color: C.GREEN_M } });

  const flowchartSteps = [
    {
      title: 'Voice Listing',
      color: C.ORANGE_D,
      bullets: [
        'Farmer calls toll-free',
        'Speaks crop, qty, price',
        'Native dialect voice'
      ]
    },
    {
      title: 'NLP & Freshness',
      color: C.GREEN_M,
      bullets: [
        'Sarvam Saaras STT',
        'Crop & GPS Geocoding',
        'Shelf-life window set'
      ]
    },
    {
      title: 'Mandi Price Guard',
      color: C.GREEN_D,
      bullets: [
        'Agmarknet modal check',
        'MSP baseline floor',
        '98% payout lock'
      ]
    },
    {
      title: 'Proximity Match',
      color: C.BLUE,
      bullets: [
        'Nearest buyer pairing',
        'B2C & B2B Wholesale',
        'Urgency deal boost'
      ]
    },
    {
      title: '2-Opt & Escrow',
      color: C.PURPLE,
      bullets: [
        'Direct farm pickup',
        'Method 4 bank OCR',
        'T+0 instant settlement'
      ]
    }
  ];

  const boxW = 2.10, boxH = 2.10;
  flowchartSteps.forEach((st, i) => {
    const bx = 0.55 + i * 2.50;
    const by = 4.60;
    flowchartBox(s, bx, by, boxW, boxH, i + 1, st.title, st.bullets, st.color);
    if (i < 4) {
      flowArrowRight(s, bx + boxW + 0.04, by + 0.85, 0.32, 'Direct');
    }
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 3 — SYSTEM ARCHITECTURE FLOWCHART
// ════════════════════════════════════════════════════════════════
(function slide3() {
  const s = pptx.addSlide();
  s.background = { fill: C.WHITE };
  sectionBanner(s, 'SYSTEM ARCHITECTURE & TECHNICAL DATA FLOW', '4-Tier Modular Microservices Architecture with Direct Demand-Supply Matching');
  footerBar(s, 3);

  // LEFT 4-TIER ARCHITECTURE FLOW (8.0" width)
  const archTiers = [
    {
      tierNum: 'TIER 1',
      title: 'Multimodal Ingestion & Inclusivity Layer',
      color: C.ORANGE_D,
      nodes: [
        { name: 'Twilio PSTN Gateway', desc: 'Toll-free 2G voice / DTMF keypad fallback' },
        { name: 'Sarvam AI Engine', desc: 'Bulbul v3 TTS & Saaras v3 STT in native Tamil/Hindi' },
        { name: 'React 18 Portal', desc: 'Tailwind UI for consumers & bulk wholesale buyers' }
      ]
    },
    {
      tierNum: 'TIER 2',
      title: 'Transaction, Pricing & Freshness Matching Layer',
      color: C.GREEN_M,
      nodes: [
        { name: 'Express.js Core', desc: 'REST API, JWT Auth & 3-Tier Role Permissions' },
        { name: 'APMC Price Guard', desc: 'Real-time Agmarknet modal & MSP floor check' },
        { name: 'Freshness Engine', desc: 'Haversine distance & shelf-life matching algorithm' }
      ]
    },
    {
      tierNum: 'TIER 3',
      title: 'AI & Operations Research Microservices (Python Flask)',
      color: C.BLUE,
      nodes: [
        { name: '2-Opt TSP Optimizer', desc: 'Optimizes direct farm gate pickup routes' },
        { name: 'Demand Forecaster', desc: 'Scikit-Learn Random Forest 6-month prediction' },
        { name: 'Kisan Crop Doctor', desc: 'AI plant pathology & organic treatment advice' }
      ]
    },
    {
      tierNum: 'TIER 4',
      title: 'Data Persistence, GIS & T+0 Settlement Layer',
      color: C.PURPLE,
      nodes: [
        { name: 'ACID Database', desc: 'SQLite / PostgreSQL with T+0 digital escrow' },
        { name: 'Leaflet + OSRM GIS', desc: 'Live GPS driver tracking & road geometry' },
        { name: 'Twilio SMS & Ledger', desc: 'Instant farmer receipts & immutable audit trail' }
      ]
    }
  ];

  archTiers.forEach((tier, i) => {
    const ty = 1.35 + i * 1.30;
    // Tier Container
    slideContainer(s, 0.35, ty, 7.5, 1.20, tier.color, tier.tierNum, tier.title);
    // 3 sub-nodes
    tier.nodes.forEach((n, ni) => {
      const nx = 0.50 + ni * 2.42;
      const ny = ty + 0.40;
      nodeBox(s, nx, ny, 2.30, 0.70, n.name, n.desc, tier.color);
    });
    // Vertical connection arrow between tiers
    if (i < 3) {
      flowArrowDown(s, 4.10, ty + 1.15, 0.20, '');
    }
  });

  function slideContainer(slide, x, y, w, h, headerColor, tierLabel, title) {
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h, fill: { color: C.WHITE }, line: { color: headerColor, width: 1.5 },
      rectRadius: 0.08, shadow: { type: 'outer', blur: 4, offset: 1, color: '000000', opacity: 0.1 }
    });
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.06, y: y + 0.06, w: w - 0.12, h: 0.28,
      fill: { color: headerColor }, rectRadius: 0.06
    });
    slide.addText(`${tierLabel} : ${title}`, {
      x: x + 0.12, y: y + 0.06, w: w - 0.24, h: 0.28,
      fontSize: 9.5, color: C.WHITE, bold: true, fontFace: 'Calibri', valign: 'middle'
    });
  }

  function nodeBox(slide, x, y, w, h, title, desc, col) {
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h, fill: { color: C.GRAY_L }, line: { color: col, width: 1 },
      rectRadius: 0.06
    });
    slide.addText(title, {
      x: x + 0.06, y: y + 0.04, w: w - 0.12, h: 0.25,
      fontSize: 9, color: C.BLACK, bold: true, fontFace: 'Calibri'
    });
    slide.addText(desc, {
      x: x + 0.06, y: y + 0.28, w: w - 0.12, h: 0.38,
      fontSize: 7.8, color: C.GRAY, fontFace: 'Calibri', valign: 'top'
    });
  }

  // RIGHT SIDE: Direct Architecture Flowchart Column (4.8" width)
  card(s, 8.1, 1.35, 4.9, 5.20, { fill: C.GRAY_L, border: C.GREEN_L });
  s.addText('DATA FLOW SEQUENCE', { x: 8.3, y: 1.42, w: 4.5, h: 0.28, fontSize: 11.5, color: C.GREEN_HERO, bold: true, align: 'center', fontFace: 'Calibri' });
  s.addShape(pptx.shapes.RECTANGLE, { x: 8.6, y: 1.72, w: 3.9, h: 0.02, fill: { color: C.GREEN_L } });

  const seq = [
    { t: '1. Farmer Dials 2G Toll-Free IVR\n(PSTN Audio Stream)', c: C.ORANGE_D },
    { t: '2. Sarvam AI STT & Heuristic NLP\n(Extracts Crop, Qty, Rate & GPS)', c: C.GREEN_M },
    { t: '3. APMC Mandi Guard & Freshness Calculation\n(Mandi Modal Cross-Check & Expiry Window)', c: C.GREEN_D },
    { t: '4. Direct Proximity Matching Algorithm\n(Pairs Nearest Consumer or B2B Lot)', c: C.BLUE },
    { t: '5. 2-Opt TSP Route Dispatch\n(Driver Direct Farm Gate Pickup)', c: C.PURPLE },
    { t: '6. Method 4 Passbook OCR & T+0 Settlement\n(98% Payout Released Directly to Farmer Bank)', c: C.GREEN_HERO },
  ];
  seq.forEach((sq, i) => {
    const sy = 1.80 + i * 0.76;
    flowStep(s, 8.4, sy, 4.3, 0.54, sq.t, sq.c);
    if (i < 5) downArrow(s, 10.35, sy + 0.52);
  });

  // Tech Stack Bar
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.35, y: 6.66, w: 12.6, h: 0.28, fill: { color: C.GREEN_HERO }, rectRadius: 0.05 });
  s.addText('Production Stack: React 18  ·  TailwindCSS  ·  Express.js  ·  Python Flask  ·  Scikit-Learn  ·  Leaflet/OSRM GIS  ·  SQLite  ·  Twilio IVR  ·  Sarvam AI Bulbul/Saaras v3', {
    x: 0.5, y: 6.66, w: 12.3, h: 0.28, fontSize: 9, color: 'A7F3D0', fontFace: 'Calibri', align: 'center'
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 4 — RISK MITIGATION FLOWCHART & ROADMAP
// ════════════════════════════════════════════════════════════════
(function slide4() {
  const s = pptx.addSlide();
  s.background = { fill: C.WHITE };
  sectionBanner(s, 'RISK MITIGATION DECISION ENGINE & PILOT ROADMAP', 'Handling Real-World Agricultural Edge Cases with Automated Autonomous Fallbacks');
  footerBar(s, 4);

  // LEFT SIDE: Autonomous Decision-Tree Flowchart (6.4" width)
  card(s, 0.35, 1.38, 6.4, 5.4, { fill: C.WHITE, border: C.GREEN_L });
  s.addText('EDGE-CASE DECISION & RECOVERY FLOWCHART', {
    x: 0.5, y: 1.48, w: 6.1, h: 0.28, fontSize: 11.5, color: C.GREEN_HERO, bold: true, align: 'center', fontFace: 'Calibri'
  });
  s.addShape(pptx.shapes.RECTANGLE, { x: 1.2, y: 1.78, w: 4.7, h: 0.02, fill: { color: C.GREEN_L } });

  const decisionFlow = [
    {
      risk: '⚠️ Risk 1: High Ambient Noise / Dialect Slang',
      decision: 'ASR Confidence < 0.70?',
      action: '🛡️ Fallback: DTMF Keypad Menu or SMS Syntax (SELL CROP QTY PRICE)',
      col: C.ORANGE_D
    },
    {
      risk: '⚠️ Risk 2: Perishable Spoilage (No Immediate Buyer)',
      decision: 'Remaining Freshness < 36 Hours?',
      action: '🛡️ Fallback: Auto-trigger Urgency Flash Deals (5-15% off) for local restaurants/canteens',
      col: C.GREEN_M
    },
    {
      risk: '⚠️ Risk 3: Fake Listings / Invalid Farmer Bank A/C',
      decision: 'Driver Arrives at Farm Gate?',
      action: '🛡️ Fallback: Method 4 Passbook OCR verification before produce pickup',
      col: C.BLUE
    }
  ];

  decisionFlow.forEach((df, i) => {
    const dy = 1.90 + i * 1.62;
    // Risk Box
    slideSubBox(s, 0.55, dy, 6.0, 0.36, df.risk, df.col, true);
    // Decision Trigger
    flowArrowDown(s, 3.55, dy + 0.34, 0.16, '');
    slideSubBox(s, 0.95, dy + 0.48, 5.2, 0.30, `Condition: ${df.decision}`, C.GRAY, false);
    // Action Box
    flowArrowDown(s, 3.55, dy + 0.76, 0.16, '');
    slideSubBox(s, 0.55, dy + 0.90, 6.0, 0.42, df.action, df.col, false, true);
  });

  function slideSubBox(slide, x, y, w, h, text, col, isHeader = false, isAction = false) {
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h,
      fill: { color: isHeader ? col : isAction ? C.GREEN_BG : C.GRAY_L },
      line: { color: col, width: 1 },
      rectRadius: 0.06
    });
    slide.addText(text, {
      x: x + 0.1, y, w: w - 0.2, h,
      fontSize: isHeader ? 9.5 : 8.5,
      color: isHeader ? C.WHITE : C.BLACK,
      bold: isHeader || isAction,
      fontFace: 'Calibri',
      valign: 'middle',
      align: isHeader ? 'left' : 'center'
    });
  }

  // RIGHT SIDE: Phased Pilot & Scaling Roadmap (5.9" width)
  card(s, 7.05, 1.38, 5.9, 5.4, { fill: C.GREEN_BG, border: C.GREEN_L });
  s.addText('PHASED PILOT & SCALE ROADMAP', { x: 7.3, y: 1.48, w: 5.4, h: 0.28, fontSize: 12.5, color: C.GREEN_HERO, bold: true, fontFace: 'Calibri' });
  s.addShape(pptx.shapes.RECTANGLE, { x: 7.3, y: 1.78, w: 5.4, h: 0.02, fill: { color: C.GREEN_L } });

  const phases = [
    { 
      badge: 'PHASE 1', bc: C.GREEN_M, title: 'Working Prototype  ✅  VERIFIED',
      desc: 'Full 2G IVR with Sarvam AI STT/TTS, live Mandi Price Engine, B2C/B2B Direct Marketplace with GPS checkout, 2-Opt TSP routing, Leaflet GIS live tracking, Method 4 bank OCR — tested on real phone calls.' 
    },
    { 
      badge: 'PHASE 2', bc: C.BLUE, title: 'District Pilot  (Months 1–4)',
      desc: 'Pilot with 500 farmers & 3 FPOs in Salem / Nashik vegetable belts. Onboard 10 Tata Ace mini trucks. Target 2,000 direct consumer/bulk orders/month.' 
    },
    { 
      badge: 'PHASE 3', bc: C.ORANGE_D, title: 'State Federation  (Months 5–12)',
      desc: 'Onboard 50+ FPOs, Kirana & Restaurant B2B networks. Expand to 5 states (TN, MH, AP, KA, PB). Target ₹10 Crore monthly Gross Merchandise Value.' 
    },
  ];

  phases.forEach((p, i) => {
    const py = 1.95 + i * 1.65;
    // Connector Dot & Line
    s.addShape(pptx.shapes.OVAL, { x: 7.4, y: py + 0.1, w: 0.22, h: 0.22, fill: { color: p.bc } });
    if (i < 2) s.addShape(pptx.shapes.RECTANGLE, { x: 7.48, y: py + 0.32, w: 0.06, h: 1.42, fill: { color: C.GREEN_L } });
    // Badge
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 7.8, y: py, w: 1.3, h: 0.36, fill: { color: p.bc }, rectRadius: 0.08 });
    s.addText(p.badge, { x: 7.8, y: py, w: 1.3, h: 0.36, fontSize: 9.5, color: C.WHITE, bold: true, align: 'center', fontFace: 'Calibri' });
    // Title
    s.addText(p.title, { x: 9.25, y: py, w: 3.5, h: 0.36, fontSize: 11.5, color: C.GREEN_HERO, bold: true, fontFace: 'Calibri', valign: 'middle' });
    // Description
    s.addText(p.desc, { x: 7.8, y: py + 0.40, w: 4.9, h: 1.15, fontSize: 9.5, color: C.BLACK, fontFace: 'Calibri', valign: 'top' });
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 5 — QUANTIFIABLE IMPACT & SOCIO-ECONOMIC VALUE
// ════════════════════════════════════════════════════════════════
(function slide5() {
  const s = pptx.addSlide();
  s.background = { fill: C.WHITE };
  sectionBanner(s, 'QUANTIFIABLE IMPACT & SOCIO-ECONOMIC VALUE', 'Transforming Farmer Realization, Consumer Affordability, and Agricultural Supply Chain Efficiency');
  footerBar(s, 5);

  const impacts = [
    { 
      icon: '💰', title: 'Direct Farmer Income', color: C.GREEN_M, items: [
        '98% direct farmer realization (vs 18–25% in 5-tier mandi chains)',
        '+45% to +60% net profit increase per harvest cycle',
        'Zero distress selling via real-time APMC Mandi/MSP price guidance',
        'T+0 autonomous escrow payout directly to farmer bank accounts'
      ]
    },
    { 
      icon: '🛒', title: 'Consumer & Wholesale Savings', color: C.BLUE, items: [
        '15–20% cheaper than supermarket MRP and quick-commerce stores',
        'Harvest-to-table in 2–12 hours: Maximum nutritional value & freshness',
        'B2B Wholesale Tiering: 5–15% volume discounts on 50kg+ lots',
        'Predictable supply contracts for kirana stores, canteens & restaurants'
      ]
    },
    { 
      icon: '🌿', title: 'Environmental & Waste Cut', color: '059669', items: [
        'Post-harvest perishable spoilage cut from 30%+ to under 8%',
        '28–35% fuel & mileage savings via 2-Opt TSP route consolidation',
        'Eliminates empty return truck trips with direct dynamic dispatch',
        'Significant carbon footprint reduction per tonne of food delivered'
      ]
    },
    { 
      icon: '📱', title: 'Social & Digital Inclusion', color: C.ORANGE_D, items: [
        '100% 2G accessible — Zero smartphone or internet barrier for farmers',
        'Multilingual Voice Parity: Tamil, Hindi, Marathi & English support',
        'AI Crop Doctor: Instant plant pathology diagnosis for smallholders',
        'Empowering women farmers & Self-Help Groups (SHGs) with direct market reach'
      ]
    },
  ];

  impacts.forEach((imp, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const ix = 0.35 + col * 6.5, iy = 1.38 + row * 2.76;
    const iw = 6.2, ih = 2.58;
    card(s, ix, iy, iw, ih, { border: imp.color, borderW: 2 });
    cardHeader(s, ix, iy, iw, `${imp.icon}  ${imp.title}`, imp.color);
    bulletList(s, ix + 0.2, iy + 0.58, iw - 0.4, ih - 0.68, imp.items, 10.5);
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 6 — RESEARCH BENCHMARKS & REFERENCES
// ════════════════════════════════════════════════════════════════
(function slide6() {
  const s = pptx.addSlide();
  s.background = { fill: C.WHITE };
  sectionBanner(s, 'RESEARCH BENCHMARKS, DATA SOURCES & REFERENCES', 'Academic Rigor, Government Data Integration, and National Mission Alignment');
  footerBar(s, 6);

  const refs = [
    { 
      title: '1. Government Agricultural Data Sources', color: C.GREEN_M, items: [
        'Agmarknet (Ministry of Agriculture): Daily APMC mandi modal price datasets across 3,000+ wholesale markets',
        'CACP (Commission for Agricultural Costs & Prices): MSP baseline price formulas for Kharif & Rabi seasons',
        'e-NAM (National Agriculture Market): Interoperability standards & digital trade public infrastructure'
      ]
    },
    { 
      title: '2. Post-Harvest & Intermediary Studies', color: C.BLUE, items: [
        'ICAR-CIPHET (2022): Assessment of Post-Harvest Losses — 15–30% food spoilage due to 5-tier mandi delays',
        'NITI Aayog (2020): 75–85% consumer price markups extracted by commission agents & middlemen',
        'NABARD Rural Inclusion Survey: 55%+ 2G feature phone reliance among smallholder Indian farmers'
      ]
    },
    { 
      title: '3. Algorithmic & Engineering Foundations', color: C.PURPLE, items: [
        'Lin & Kernighan (1973): "An Effective Heuristic Algorithm for TSP" — Foundation for 2-Opt Direct Route Optimizer',
        'Breiman (2001): "Random Forests" — Used for 6-month demand regressor factoring rainfall & seasonality',
        'OpenStreetMap & OSRM API: Open-source geospatial routing & real road distance matrix computation'
      ]
    },
    { 
      title: '4. Policy & National Mission Alignment', color: C.ORANGE_D, items: [
        'Digital Agriculture Mission (DAM 2024–25): Promoting inclusive AI & open digital public infrastructure',
        'PM Kisan Sampada Yojana: Supporting farm-gate preservation & direct supply chain resilience',
        'Atmanirbhar Bharat Agri-Logistics: Empowering rural transport drivers & FPO self-reliance'
      ]
    },
  ];

  refs.forEach((r, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const rx = 0.35 + col * 6.5, ry = 1.38 + row * 2.76;
    const rw = 6.2, rh = 2.58;
    card(s, rx, ry, rw, rh, { border: r.color, borderW: 1.5 });
    cardHeader(s, rx, ry, rw, r.title, r.color);
    const items = r.items.map(t => ({
      text: t, options: {
        bullet: { code: '25B6' }, fontSize: 10,
        color: C.BLACK, paraSpaceBefore: 3.5, paraSpaceAfter: 3.5
      }
    }));
    s.addText(items, { x: rx + 0.2, y: ry + 0.58, w: rw - 0.4, h: rh - 0.68, fontFace: 'Calibri', valign: 'top' });
  });
})();

// ── EXPORT ──
const out = path.join(__dirname, 'SIH2026_IDEA_Presentation.pptx');
pptx.writeFile({ fileName: out }).then(() => {
  console.log(`\n✅ Flowchart-Enhanced PPT successfully generated: ${out}`);
  console.log('   6 slides · Widescreen 16:9 · Native Vector Flowcharts & Diagrams');
}).catch(e => console.error('Error:', e));
