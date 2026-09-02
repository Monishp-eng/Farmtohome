import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

template_path = r"C:\Users\Monish P\Downloads\SIH2026-IDEA-Presentation-Format.pptx"
output_path = r"C:\Users\Monish P\Downloads\For Farmers For Us\SIH2026_IDEA_Presentation_Template.pptx"

prs = Presentation(template_path)

# ── HUMAN CRAFTED CLEAN COLOR PALETTE ──
C_DARK       = RGBColor(15, 23, 42)      # Deep Slate #0F172A
C_GREEN_HERO = RGBColor(6, 78, 59)       # Rich Forest #064E3B
C_GREEN_D    = RGBColor(6, 95, 70)       # Dark Emerald #065F46
C_GREEN_M    = RGBColor(5, 150, 105)     # Primary Mint #059669
C_GREEN_L    = RGBColor(16, 185, 129)    # Bright Green #10B981
C_GREEN_PALE = RGBColor(209, 250, 229)   # Pale Mint #D1FAE5
C_GREEN_BG   = RGBColor(242, 253, 245)   # Light Fresh Tint
C_ORANGE     = RGBColor(234, 88, 12)     # Vivid Warm Orange
C_ORANGE_D   = RGBColor(194, 65, 12)     # Deep Amber
C_RED        = RGBColor(220, 38, 38)     # Alert Red
C_BLUE       = RGBColor(30, 64, 175)     # Deep Corporate Blue
C_BLUE_BG    = RGBColor(239, 246, 255)   # Soft Blue Tint
C_PURPLE     = RGBColor(109, 40, 217)    # Deep Purple
C_WHITE      = RGBColor(255, 255, 255)
C_BLACK      = RGBColor(30, 41, 59)      # Charcoal Black
C_GRAY       = RGBColor(71, 85, 105)     # Slate Gray
C_GRAY_L     = RGBColor(248, 250, 252)   # Clean Off-White

# ── HELPER BUILDERS WITH GENEROUS SIZING & CRISP HUMAN TYPOGRAPHY ──
def add_card(slide, left, top, width, height, bg_color=C_WHITE, border_color=C_GREEN_M, border_width=Pt(1.8)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = border_color
    shape.line.width = border_width
    return shape

def add_header_pill(slide, left, top, width, height, text, bg_color=C_GREEN_M, font_size=13, text_color=C_WHITE):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.fill.background()
    tf = shape.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(font_size)
    p.font.bold = True
    p.font.color.rgb = text_color
    p.font.name = "Calibri"
    return shape

def add_bullets(slide, left, top, width, height, items, font_size=13.5, text_color=C_BLACK):
    txBox = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.margin_top = Inches(0.04)
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_bottom = Inches(0.04)
    
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = f"•  {item}"
        p.font.size = Pt(font_size)
        p.font.color.rgb = text_color
        p.font.name = "Calibri"
        p.space_after = Pt(6)
    return txBox

def add_stat_box(slide, left, top, width, height, num, label, num_color=C_ORANGE, bg_color=C_GREEN_D):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = num_color
    shape.line.width = Pt(2.0)
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_top = Inches(0.08)
    
    p1 = tf.paragraphs[0]
    p1.text = num
    p1.alignment = PP_ALIGN.CENTER
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = num_color
    p1.font.name = "Calibri"
    
    p2 = tf.add_paragraph()
    p2.text = label
    p2.alignment = PP_ALIGN.CENTER
    p2.font.size = Pt(13)
    p2.font.bold = True
    p2.font.color.rgb = C_GREEN_PALE
    p2.font.name = "Calibri"
    p2.space_before = Pt(2)
    return shape

def add_flow_step(slide, left, top, width, height, num, title, subtitle, col=C_GREEN_M):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    card.fill.solid()
    card.fill.fore_color.rgb = C_WHITE
    card.line.color.rgb = col
    card.line.width = Pt(2.0)
    
    # Step header pill
    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left + 0.08), Inches(top + 0.08), Inches(width - 0.16), Inches(0.38))
    pill.fill.solid()
    pill.fill.fore_color.rgb = col
    pill.line.fill.background()
    p = pill.text_frame.paragraphs[0]
    p.text = f"Step {num}: {title}"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.font.name = "Calibri"
    
    # Subtitle text
    tx = slide.shapes.add_textbox(Inches(left + 0.10), Inches(top + 0.50), Inches(width - 0.20), Inches(height - 0.55))
    tf = tx.text_frame
    tf.word_wrap = True
    tf.margin_top = Inches(0.02)
    p2 = tf.paragraphs[0]
    p2.text = subtitle
    p2.font.size = Pt(11.5)
    p2.font.color.rgb = C_BLACK
    p2.font.name = "Calibri"
    p2.alignment = PP_ALIGN.CENTER

def add_right_arrow(slide, left, top, width=0.34, height=0.28, col=C_GREEN_M):
    arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(left), Inches(top), Inches(width), Inches(height))
    arrow.fill.solid()
    arrow.fill.fore_color.rgb = col
    arrow.line.fill.background()
    return arrow

def clear_content_placeholders(slide):
    shapes_to_remove = []
    for shape in slide.shapes:
        if shape.has_text_frame:
            txt = shape.text_frame.text.strip().lower()
            if any(k in txt for k in ["detailed explanation", "technologies to be used", "analysis of the feasibility", "potential impact", "details / links of the reference", "proposed solution (describe your idea", "methodology and process"]):
                shapes_to_remove.append(shape)
    for s in shapes_to_remove:
        sp = s._element
        sp.getparent().remove(sp)


# ========================================================
# SLIDE 1: TITLE PAGE (BOLD, IMPACTFUL, READABLE)
# ========================================================
s1 = prs.slides[0]
for shape in s1.shapes:
    if shape.has_text_frame:
        txt = shape.text_frame.text.strip()
        if "problem statement id" in txt.lower():
            tf = shape.text_frame
            tf.clear()
            
            lines = [
                ("Project Name:", "  KisanSetu", C_ORANGE, True, 22),
                ("Tagline:", "  2G Voice AI & Direct Farm-to-Consumer Fair Trade", C_GREEN_HERO, True, 14),
                ("Problem ID:", "  26033", C_DARK, True, 15),
                ("Problem:", '  "Middlemen reduce farmers\' earnings & hike consumer prices"', C_BLACK, False, 13.5),
                ("Theme:", "  Agriculture, FoodTech & Rural Development", C_DARK, True, 13.5),
                ("Category:", "  Software  |  Team: Team KisanSetu", C_GREEN_HERO, True, 14.5),
            ]
            for i, (k, v, col, bold, size) in enumerate(lines):
                p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
                r1 = p.add_run()
                r1.text = k
                r1.font.bold = True
                r1.font.size = Pt(size)
                r1.font.color.rgb = col
                r1.font.name = "Calibri"
                
                r2 = p.add_run()
                r2.text = v
                r2.font.bold = bold
                r2.font.size = Pt(size)
                r2.font.color.rgb = col
                r2.font.name = "Calibri"
                p.space_after = Pt(6)

# Right Side 3 Big Clear Stat Cards
add_stat_box(s1, 7.50, 1.95, 5.10, 1.45, "65%", "Lost to Middlemen Commissions", C_RED, C_GREEN_D)
add_stat_box(s1, 7.50, 3.55, 5.10, 1.45, "120 Million", "Farmers with Basic 2G Phones", C_ORANGE, C_GREEN_D)
add_stat_box(s1, 7.50, 5.15, 5.10, 1.45, "98%", "Direct Payout to Farmer Bank A/C", C_GREEN_L, C_GREEN_D)

# Update oval team name on all slides
for slide in prs.slides:
    for shape in slide.shapes:
        if shape.has_text_frame and "your team name" in shape.text_frame.text.lower():
            shape.text_frame.paragraphs[0].text = "KisanSetu"
            shape.text_frame.paragraphs[0].font.size = Pt(11)
            shape.text_frame.paragraphs[0].font.bold = True
            shape.text_frame.paragraphs[0].font.color.rgb = C_WHITE


# ========================================================
# SLIDE 2: PROPOSED SOLUTION & CLEAR 5-STEP FLOWCHART
# ========================================================
s2 = prs.slides[1]
clear_content_placeholders(s2)

for shape in s2.shapes:
    if shape.has_text_frame and "idea title" in shape.text_frame.text.lower():
        shape.text_frame.paragraphs[0].text = "PROPOSED SOLUTION — HOW KISANSETU WORKS"
        shape.text_frame.paragraphs[0].font.size = Pt(22)
        shape.text_frame.paragraphs[0].font.bold = True
        shape.text_frame.paragraphs[0].font.color.rgb = C_GREEN_HERO

# Top: 3 Big Spacious Cards (13.5pt font, bold readable text)
p1_bullets = [
    "Toll-free IVR for any ₹800 keypad phone (Zero internet/4G needed)",
    "Speaks natural Tamil, Hindi & English (Sarvam AI Voice)",
    "Instant SMS confirmation with official listing ID"
]
p2_bullets = [
    "Zero warehouse delays: Produce plucked fresh upon order",
    "Tracks harvest date & shelf-life countdown (e.g. 4 days fresh)",
    "Pairs nearest consumers & local restaurants (<50 km)"
]
p3_bullets = [
    "Live APMC Mandi modal price & Govt MSP floor check",
    "2-Opt shared vehicle routing delivers in 24 hours",
    "98% direct payout to farmer bank, 2% platform fee"
]

pillars = [
    ("1. 2G Voice AI Helpline", p1_bullets, C_ORANGE_D),
    ("2. Direct Freshness Match", p2_bullets, C_GREEN_M),
    ("3. Fair Price & Direct Delivery", p3_bullets, C_BLUE)
]

for i, (title, items, col) in enumerate(pillars):
    px = 0.50 + i * 4.15
    add_card(s2, px, 1.30, 3.95, 2.70, border_color=col)
    add_header_pill(s2, px + 0.10, 1.40, 3.75, 0.42, title, bg_color=col, font_size=13)
    add_bullets(s2, px + 0.18, 1.92, 3.60, 2.00, items, font_size=12.5)

# Bottom: 5-Stage Visual Flowchart (Bold & Legible from afar)
add_card(s2, 0.50, 4.20, 12.30, 2.60, bg_color=C_GREEN_BG, border_color=C_GREEN_M)
add_header_pill(s2, 3.65, 4.30, 6.00, 0.36, "END-TO-END DIRECT OPERATIONAL FLOW", bg_color=C_GREEN_HERO, font_size=12)

flow_steps_s2 = [
    ("1", "2G Call", "Farmer dials toll-free &\nspeaks crop, qty & price", C_ORANGE_D),
    ("2", "AI Voice", "Sarvam AI extracts data &\ncalculates freshness days", C_GREEN_M),
    ("3", "Mandi Guard", "APMC price check ensures\nno distress underpricing", C_GREEN_D),
    ("4", "Local Match", "Matches nearest consumer\nor bulk restaurant order", C_BLUE),
    ("5", "Direct Payout", "Farm gate pickup &\n98% direct bank transfer", C_PURPLE)
]

for i, (num, title, sub, col) in enumerate(flow_steps_s2):
    bx = 0.65 + i * 2.44
    by = 4.78
    add_flow_step(s2, bx, by, 2.05, 1.85, num, title, sub, col=col)
    if i < 4:
        add_right_arrow(s2, bx + 2.10, by + 0.78, 0.28, col=C_GREEN_M)


# ========================================================
# SLIDE 3: TECHNICAL APPROACH & SYSTEM ARCHITECTURE
# ========================================================
s3 = prs.slides[2]
clear_content_placeholders(s3)

for shape in s3.shapes:
    if shape.has_text_frame and "technical approach" in shape.text_frame.text.lower():
        shape.text_frame.paragraphs[0].text = "TECHNICAL APPROACH & SYSTEM ARCHITECTURE"
        shape.text_frame.paragraphs[0].font.size = Pt(22)
        shape.text_frame.paragraphs[0].font.bold = True
        shape.text_frame.paragraphs[0].font.color.rgb = C_GREEN_HERO

# Left Side: 3 Clean Microservice Layers (Spacious & 13pt font)
add_card(s3, 0.50, 1.30, 6.80, 5.25, border_color=C_GREEN_L)
add_header_pill(s3, 0.60, 1.40, 6.60, 0.38, "MODULAR MICROSERVICES ARCHITECTURE", bg_color=C_GREEN_HERO, font_size=13)

arch_layers = [
    ("1. Voice & Web Ingestion Layer", [
        "Twilio PSTN Gateway: Toll-free 2G IVR for ₹800 feature phones",
        "Sarvam AI Bulbul/Saaras v3: Voice STT/TTS in Tamil & Hindi",
        "React 18 + Tailwind: Responsive buyer & wholesale portal"
    ], C_ORANGE_D),
    ("2. Price Guard & Matching Core", [
        "Node.js/Express REST API: JWT auth & role management",
        "APMC Mandi Guard: Real-time price cross-check against MSP",
        "Freshness Matcher: Proximity & shelf-life ranking engine"
    ], C_GREEN_M),
    ("3. Route AI & Direct Settlement", [
        "Python Flask: 2-Opt TSP algorithm for shared farm pickup",
        "Leaflet + OSRM Maps: Real road geometry & live driver GPS",
        "T+0 Escrow Engine: Automatic bank payout on delivery POD"
    ], C_BLUE)
]

for i, (layer_title, layer_items, col) in enumerate(arch_layers):
    ly = 1.88 + i * 1.50
    add_card(s3, 0.65, ly, 6.50, 1.40, bg_color=C_GRAY_L, border_color=col, border_width=Pt(1.2))
    add_header_pill(s3, 0.75, ly + 0.08, 6.30, 0.32, layer_title, bg_color=col, font_size=11)
    add_bullets(s3, 0.85, ly + 0.44, 6.10, 0.90, layer_items, font_size=11)

# Right Side: Direct 6-Step Execution Flow
add_card(s3, 7.50, 1.30, 5.30, 5.25, bg_color=C_GRAY_L, border_color=C_GREEN_L)
add_header_pill(s3, 7.60, 1.40, 5.10, 0.38, "DIRECT EXECUTION PIPELINE", bg_color=C_GREEN_HERO, font_size=13)

seq_steps_clean = [
    ("1. Farmer calls toll-free 2G IVR", C_ORANGE_D),
    ("2. Sarvam AI converts speech to listing", C_GREEN_M),
    ("3. Mandi rates checked to prevent underpricing", C_GREEN_D),
    ("4. Nearest buyer matched within 50 km", C_BLUE),
    ("5. 2-Opt driver dispatched to farm gate", C_PURPLE),
    ("6. 98% money transferred to farmer bank", C_GREEN_HERO)
]

for i, (step_txt, col) in enumerate(seq_steps_clean):
    sy = 1.90 + i * 0.76
    box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.70), Inches(sy), Inches(4.90), Inches(0.55))
    box.fill.solid()
    box.fill.fore_color.rgb = col
    box.line.fill.background()
    p = box.text_frame.paragraphs[0]
    p.text = step_txt
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.font.name = "Calibri"

# Bottom Stack Bar
stack_bar = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.50), Inches(6.65), Inches(12.30), Inches(0.30))
stack_bar.fill.solid()
stack_bar.fill.fore_color.rgb = C_GREEN_HERO
stack_bar.line.fill.background()
p = stack_bar.text_frame.paragraphs[0]
p.text = "Stack: React 18  ·  Node.js Express  ·  Python Flask  ·  Scikit-Learn  ·  Leaflet / OSRM  ·  SQLite  ·  Twilio  ·  Sarvam AI"
p.alignment = PP_ALIGN.CENTER
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = C_GREEN_PALE
p.font.name = "Calibri"


# ========================================================
# SLIDE 4: FEASIBILITY, RISK MITIGATION & ROADMAP
# ========================================================
s4 = prs.slides[3]
clear_content_placeholders(s4)

for shape in s4.shapes:
    if shape.has_text_frame and "feasibility" in shape.text_frame.text.lower():
        shape.text_frame.paragraphs[0].text = "FEASIBILITY, RISK MITIGATION & ROADMAP"
        shape.text_frame.paragraphs[0].font.size = Pt(22)
        shape.text_frame.paragraphs[0].font.bold = True
        shape.text_frame.paragraphs[0].font.color.rgb = C_GREEN_HERO

# Left: Real Challenges & Clear Fixes (13pt font)
add_card(s4, 0.50, 1.30, 6.00, 5.30, border_color=C_GREEN_L)
add_header_pill(s4, 0.60, 1.40, 5.80, 0.38, "REAL CHALLENGES & PRACTICAL FIXES", bg_color=C_GREEN_HERO, font_size=13)

risks_clean = [
    ("1. Noisy Phone Lines / Rural Dialects", [
        "Challenge: Background tractor noise can degrade voice STT",
        "Fix: DTMF keypad menu + Simple SMS fallback (SELL TOMATO 100KG 25)"
    ], C_ORANGE_D),
    ("2. Perishable Crop Spoilage Risk", [
        "Challenge: Fresh vegetables spoil if not sold in 48-72 hours",
        "Fix: Auto-discounting urgency deals for local restaurants & bulk buyers"
    ], C_GREEN_M),
    ("3. Fake Listings / Bank Verification", [
        "Challenge: Risk of inaccurate listings or invalid bank accounts",
        "Fix: Driver inspects produce & scans bank passbook at farm gate"
    ], C_BLUE)
]

for i, (r_title, r_items, col) in enumerate(risks_clean):
    ry = 1.88 + i * 1.50
    add_card(s4, 0.65, ry, 5.70, 1.40, bg_color=C_GRAY_L, border_color=col, border_width=Pt(1.2))
    add_header_pill(s4, 0.75, ry + 0.08, 5.50, 0.30, r_title, bg_color=col, font_size=11)
    add_bullets(s4, 0.82, ry + 0.42, 5.35, 0.90, r_items, font_size=11)

# Right: Phased Roadmap (13pt font)
add_card(s4, 6.70, 1.30, 6.10, 5.30, bg_color=C_GREEN_BG, border_color=C_GREEN_L)
add_header_pill(s4, 6.80, 1.40, 5.90, 0.38, "PHASED PILOT & SCALE ROADMAP", bg_color=C_GREEN_HERO, font_size=13)

phases_clean = [
    ("PHASE 1", "Working Prototype (DONE ✅)", [
        "End-to-end 2G IVR voice listing tested on real calls",
        "Live APMC price checking, direct marketplace & 2-Opt routing"
    ], C_GREEN_M),
    ("PHASE 2", "District Pilot (Months 1–4)", [
        "500 farmers in Salem / Nashik vegetable clusters",
        "10 shared mini-trucks handling 2,000 monthly orders"
    ], C_BLUE),
    ("PHASE 3", "State Federation (Months 5–12)", [
        "50+ FPOs & restaurant wholesale networks across 5 states",
        "Target ₹10 Crore monthly Gross Merchandise Value"
    ], C_ORANGE_D)
]

for i, (badge, p_title, p_items, col) in enumerate(phases_clean):
    py = 1.88 + i * 1.50
    add_card(s4, 6.85, py, 5.80, 1.40, bg_color=C_WHITE, border_color=col, border_width=Pt(1.2))
    add_header_pill(s4, 6.95, py + 0.08, 5.60, 0.30, f"{badge}: {p_title}", bg_color=col, font_size=11)
    add_bullets(s4, 7.05, py + 0.42, 5.45, 0.90, p_items, font_size=11)


# ========================================================
# SLIDE 5: QUANTIFIABLE IMPACT & SOCIAL VALUE
# ========================================================
s5 = prs.slides[4]
clear_content_placeholders(s5)

for shape in s5.shapes:
    if shape.has_text_frame and "impact" in shape.text_frame.text.lower():
        shape.text_frame.paragraphs[0].text = "QUANTIFIABLE IMPACT & SOCIAL VALUE"
        shape.text_frame.paragraphs[0].font.size = Pt(22)
        shape.text_frame.paragraphs[0].font.bold = True
        shape.text_frame.paragraphs[0].font.color.rgb = C_GREEN_HERO

impacts_clean = [
    ("💰 1. Direct Farmer Income (+50%)", [
        "98% direct payment (vs 18–25% in traditional mandis)",
        "+45% to +60% net profit increase per crop cycle",
        "Zero distress selling with real-time MSP price floor",
        "Same-day direct bank settlement upon delivery"
    ], C_GREEN_M),
    ("🛒 2. Consumer Savings (15–20%)", [
        "15–20% cheaper than supermarkets and quick-commerce",
        "Harvest-to-doorstep in 24 hours (Maximum nutrition)",
        "Bulk wholesale discounts (5–15%) for restaurants & hostels",
        "100% price transparency against APMC Mandi rates"
    ], C_BLUE),
    ("🌿 3. Food Waste Cut (30% ➔ <8%)", [
        "Cuts transit delay from 5 days to under 24 hours",
        "28–35% fuel savings from shared mini-truck direct routes",
        "Zero empty return truck trips with dynamic dispatch",
        "Significant carbon footprint reduction per tonne"
    ], C_GREEN_D),
    ("📱 4. 100% Rural Digital Inclusion", [
        "Works on ₹800 keypad phones — Zero internet needed",
        "Full voice parity in Tamil, Hindi & English",
        "AI Crop Doctor: Instant plant diagnosis for smallholders",
        "Empowers women farmers & Self-Help Groups (SHGs)"
    ], C_ORANGE_D)
]

for i, (title, items, col) in enumerate(impacts_clean):
    col_idx = i % 2
    row_idx = i // 2
    ix = 0.50 + col_idx * 6.25
    iy = 1.30 + row_idx * 2.72
    add_card(s5, ix, iy, 6.05, 2.55, border_color=col)
    add_header_pill(s5, ix + 0.10, iy + 0.10, 5.85, 0.42, title, bg_color=col, font_size=13)
    add_bullets(s5, ix + 0.20, iy + 0.60, 5.65, 1.85, items, font_size=12)


# ========================================================
# SLIDE 6: RESEARCH BENCHMARKS & REFERENCES
# ========================================================
s6 = prs.slides[5]
clear_content_placeholders(s6)

for shape in s6.shapes:
    if shape.has_text_frame and "research" in shape.text_frame.text.lower():
        shape.text_frame.paragraphs[0].text = "RESEARCH BENCHMARKS & REFERENCES"
        shape.text_frame.paragraphs[0].font.size = Pt(22)
        shape.text_frame.paragraphs[0].font.bold = True
        shape.text_frame.paragraphs[0].font.color.rgb = C_GREEN_HERO

refs_clean = [
    ("1. Govt Agricultural Data Sources", [
        "Agmarknet (Ministry of Agriculture): Daily APMC mandi modal price datasets across 3,000+ wholesale markets",
        "CACP & e-NAM: Minimum Support Price (MSP) baseline formulas and digital agriculture public infrastructure"
    ], C_GREEN_M),
    ("2. Post-Harvest & Supply Chain Studies", [
        "ICAR-CIPHET (2022): Assessment of Post-Harvest Losses — 15–30% food spoilage due to 5-tier mandi delays",
        "NITI Aayog (2020): 75–85% price markups extracted by commission agents & middlemen in wholesale chains"
    ], C_BLUE),
    ("3. Engineering & Algorithm Foundations", [
        "Lin-Kernighan 2-Opt Algorithm: Proven heuristic for vehicle routing optimization and fuel reduction",
        "OpenStreetMap & OSRM Engine: Real road geometry matrix computation for farm-to-fork logistics"
    ], C_PURPLE),
    ("4. National Mission Alignment", [
        "Digital Agriculture Mission (DAM 2024–25): Promoting inclusive AI tools for smallholder Indian farmers",
        "PM Kisan Sampada Yojana: Supporting farm-gate preservation, cold-chain resilience & direct market access"
    ], C_ORANGE_D)
]

for i, (title, items, col) in enumerate(refs_clean):
    col_idx = i % 2
    row_idx = i // 2
    rx = 0.50 + col_idx * 6.25
    ry = 1.30 + row_idx * 2.72
    add_card(s6, rx, ry, 6.05, 2.55, border_color=col)
    add_header_pill(s6, rx + 0.10, ry + 0.10, 5.85, 0.42, title, bg_color=col, font_size=12.5)
    add_bullets(s6, rx + 0.20, ry + 0.60, 5.65, 1.85, items, font_size=11.5)

# Save populated template
prs.save(output_path)
print(f"\n[OK] Successfully generated human-crafted SIH Template PPT: {output_path}")
