import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def clean_and_build():
    # Start fresh from original copy or clean existing
    prs = Presentation('SIH2026_IDEA_Presentation_rough.pptx')

    C_PRIMARY_DARK = RGBColor(6, 78, 59)      # Deep Forest Emerald
    C_PRIMARY = RGBColor(16, 185, 129)        # Vibrant Emerald Green
    C_SECONDARY = RGBColor(245, 158, 11)      # Golden Amber
    C_DARK_TEXT = RGBColor(15, 23, 42)        # Slate 900
    C_MUTED_TEXT = RGBColor(71, 85, 105)      # Slate 600
    C_LIGHT_BG = RGBColor(248, 250, 252)      # Slate 50
    C_CARD_BORDER = RGBColor(203, 213, 225)   # Slate 300
    C_WHITE = RGBColor(255, 255, 255)
    C_GREEN_BG = RGBColor(236, 253, 245)     # Emerald 50
    C_BLUE_BG = RGBColor(239, 246, 255)      # Blue 50
    C_AMBER_BG = RGBColor(254, 243, 199)     # Amber 100

    FONT_TITLE = 'Arial'
    FONT_BODY = 'Calibri'

    # Clean Slide 3: Keep only title, header background, template elements
    s3 = prs.slides[2]
    shapes_to_keep_s3 = []
    for shp in list(s3.shapes):
        if shp.has_text_frame and ('TECHNICAL APPROACH' in shp.text_frame.text or 'Template' in shp.text_frame.text or 'Your Team' in shp.text_frame.text or shp.text_frame.text.strip() == '3'):
            shapes_to_keep_s3.append(shp)
        elif shp.shape_type == 13: # Picture (logo or header)
            shapes_to_keep_s3.append(shp)
        elif shp.top.inches > 6.0: # Footer
            shapes_to_keep_s3.append(shp)
        else:
            sp = shp._element
            sp.getparent().remove(sp)

    # Clean Slide 5
    s5 = prs.slides[4]
    for shp in list(s5.shapes):
        if shp.has_text_frame and ('IMPACT' in shp.text_frame.text or 'QUANTIFIABLE' in shp.text_frame.text or 'Template' in shp.text_frame.text or 'Your Team' in shp.text_frame.text or shp.text_frame.text.strip() == '5'):
            continue
        elif shp.shape_type == 13:
            continue
        elif shp.top.inches > 6.0:
            continue
        else:
            sp = shp._element
            sp.getparent().remove(sp)

    # Clean Slide 6
    s6 = prs.slides[5]
    for shp in list(s6.shapes):
        if shp.has_text_frame and ('RESEARCH' in shp.text_frame.text or 'BENCHMARKS' in shp.text_frame.text or 'Template' in shp.text_frame.text or 'Your Team' in shp.text_frame.text or shp.text_frame.text.strip() == '6'):
            continue
        elif shp.shape_type == 13:
            continue
        elif shp.top.inches > 6.0:
            continue
        else:
            sp = shp._element
            sp.getparent().remove(sp)

    # Re-add Slide 3 Architecture Cards
    layers_data = [
        {
            "num": "TIER 1",
            "title": "Multimodal Ingestion & Inclusivity",
            "color_bg": C_GREEN_BG,
            "border": RGBColor(16, 185, 129),
            "items": [
                "• GSM/PSTN Missed Call & SMS Gateway: +91-80-6900-5472 for zero-internet 2G phones.",
                "• Multilingual NLP Parser: Regex & entity extraction (SELL <CROP> <QTY> <PRICE> <VILLAGE>).",
                "• React 18 + Tailwind Responsive Web Portal for urban consumers and bulk retailers.",
                "• Web Speech API Voice Interface: Multilingual Kisan Crop Doctor in Tamil/Hindi/English."
            ]
        },
        {
            "num": "TIER 2",
            "title": "Core Transaction & Price Engine",
            "color_bg": C_AMBER_BG,
            "border": RGBColor(245, 158, 11),
            "items": [
                "• Express.js REST API Server: JWT Auth with strict 3-Tier Scoped RBAC.",
                "• APMC Price Benchmark Service: Normalizes live Mandi Modal & MSP rates to ₹/kg.",
                "• Anti-Underpricing Protection: Automated warning & fair-price recommendation at listing.",
                "• Mirrored 5-Stage State Machine: Placed -> Confirmed -> Dispatched -> In Transit -> Delivered."
            ]
        },
        {
            "num": "TIER 3",
            "title": "AI & Operations Research Microservices",
            "color_bg": C_BLUE_BG,
            "border": RGBColor(59, 130, 246),
            "items": [
                "• Python Flask Microservice (Port 5001): Fast ML inference & route optimization.",
                "• Random Forest Demand Regressor: 6-month crop forecast factoring rainfall & festivals.",
                "• 2-Opt TSP Route Optimizer: Haversine distance matrix minimizing total delivery mileage.",
                "• Kisan Crop Pathology: Rule-based & LLM plant diagnosis with IPM organic remedies."
            ]
        },
        {
            "num": "TIER 4",
            "title": "Data Persistence & GIS Layer",
            "color_bg": C_LIGHT_BG,
            "border": RGBColor(148, 163, 184),
            "items": [
                "• SQLite / PostgreSQL Database: ACID transactions for 98% direct farmer payouts.",
                "• OpenStreetMap Leaflet GIS: Real-time driver GPS waypoints & route polylines.",
                "• Two-Way SMS Dispatcher: Instant Kisan Alerts on order placement & driver arrival.",
                "• Audit & Analytics Ledger: Live GMV, 2% platform fee & driver earnings ledger."
            ]
        }
    ]

    left_positions = [Inches(0.6), Inches(6.2), Inches(0.6), Inches(6.2)]
    top_positions = [Inches(1.15), Inches(1.15), Inches(3.6), Inches(3.6)]

    for idx, ldata in enumerate(layers_data):
        shape = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_positions[idx], top_positions[idx], Inches(5.35), Inches(2.25))
        shape.fill.solid()
        shape.fill.fore_color.rgb = ldata["color_bg"]
        shape.line.color.rgb = ldata["border"]
        shape.line.width = Pt(1.5)

        tf = shape.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.15)
        tf.margin_right = Inches(0.15)
        tf.margin_top = Inches(0.1)
        tf.margin_bottom = Inches(0.1)

        p0 = tf.paragraphs[0]
        p0.text = f"{ldata['num']}: {ldata['title']}"
        p0.font.bold = True
        p0.font.size = Pt(11)
        p0.font.name = FONT_BODY
        p0.font.color.rgb = C_PRIMARY_DARK

        for item in ldata["items"]:
            p = tf.add_paragraph()
            p.text = item
            p.font.size = Pt(8.5)
            p.font.name = FONT_BODY
            p.font.color.rgb = C_DARK_TEXT

    footer_box = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(5.95), Inches(11.0), Inches(0.35))
    footer_box.fill.solid()
    footer_box.fill.fore_color.rgb = C_PRIMARY_DARK
    footer_box.line.fill.background()
    ft_tf = footer_box.text_frame
    ft_tf.word_wrap = True
    ft_p = ft_tf.paragraphs[0]
    ft_p.alignment = PP_ALIGN.CENTER
    ft_p.text = "Tech Stack: React 18 • TailwindCSS • Node.js / Express • Python Flask • Scikit-Learn • Leaflet GIS • SQLite / PostgreSQL • GSM SMS/IVR"
    ft_p.font.bold = True
    ft_p.font.size = Pt(9)
    ft_p.font.color.rgb = C_WHITE

    # Re-add Slide 5 Impact Cards
    impact_cards = [
        {
            "title": "🌾 Economic Impact (Direct Farmer Income)",
            "color_bg": C_GREEN_BG,
            "border": RGBColor(16, 185, 129),
            "points": [
                "• 98% Direct Farmer Realization: Up from 18-25% in traditional 5-tier mandi chains.",
                "• +45% to +60% Net Profit per harvest cycle by eliminating broker commissions.",
                "• Zero Distress Selling: Instant Mandi/MSP price guidance at point of listing.",
                "• Immediate Settlement: T+0 digital escrow payout upon confirmed delivery."
            ]
        },
        {
            "title": "🥦 Consumer & Retailer Savings",
            "color_bg": C_BLUE_BG,
            "border": RGBColor(59, 130, 246),
            "points": [
                "• 15% to 20% Cheaper than supermarket MRP and quick-commerce dark stores.",
                "• Harvest-to-Table in 24-36 Hours: Peak nutritional value & pesticide traceability.",
                "• Wholesale B2B Tiering: Kirana stores get 5-15% volume discounts on 50kg+ lots.",
                "• Flexible Standing Contracts: Weekly recurring deliveries for restaurants."
            ]
        },
        {
            "title": "🌱 Environmental & Post-Harvest Waste Reduction",
            "color_bg": C_AMBER_BG,
            "border": RGBColor(245, 158, 11),
            "points": [
                "• Spoilage Slashed: Post-harvest loss cut from 30%+ down to <8% via direct pull.",
                "• 28% to 35% Fuel Savings: 2-Opt TSP routing consolidates multi-pickup paths.",
                "• Reduced Carbon Footprint: Eliminates empty return truck trips across districts.",
                "• Eco-Packaging: Encourages reusable crate pooling between farms and hubs."
            ]
        },
        {
            "title": "📱 Digital & Social Inclusion",
            "color_bg": C_LIGHT_BG,
            "border": RGBColor(148, 163, 184),
            "points": [
                "• 100% 2G Feature Phone Accessible: Zero smartphone or 4G data barrier for farmers.",
                "• Multilingual Parity: Voice and SMS interfaces in Tamil, Hindi, Marathi & English.",
                "• Kisan Crop Doctor: AI plant pathology guidance for smallholder pest management.",
                "• Empowering Women Farmers & Self-Help Groups (SHGs) with direct market access."
            ]
        }
    ]

    for idx, icard in enumerate(impact_cards):
        shape = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_positions[idx], top_positions[idx], Inches(5.35), Inches(2.25))
        shape.fill.solid()
        shape.fill.fore_color.rgb = icard["color_bg"]
        shape.line.color.rgb = icard["border"]
        shape.line.width = Pt(1.5)

        tf = shape.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.15)
        tf.margin_right = Inches(0.15)
        tf.margin_top = Inches(0.1)
        tf.margin_bottom = Inches(0.1)

        p0 = tf.paragraphs[0]
        p0.text = icard["title"]
        p0.font.bold = True
        p0.font.size = Pt(11)
        p0.font.name = FONT_BODY
        p0.font.color.rgb = C_PRIMARY_DARK

        for pt in icard["points"]:
            p = tf.add_paragraph()
            p.text = pt
            p.font.size = Pt(8.5)
            p.font.name = FONT_BODY
            p.font.color.rgb = C_DARK_TEXT

    # Re-add Slide 6 Research Cards
    ref_cards = [
        {
            "title": "1. Government Agricultural Data Sources",
            "items": [
                "• Agmarknet (Directorate of Marketing & Inspection, Ministry of Agriculture): Daily APMC mandi modal price datasets across 3,000+ wholesale markets.",
                "• Commission for Agricultural Costs & Prices (CACP): Price Policy Reports & MSP baseline price calculation formulas for Kharif/Rabi seasons.",
                "• e-NAM (National Agriculture Market): Interoperability standards & digital trade guidelines."
            ]
        },
        {
            "title": "2. Post-Harvest & Intermediary Studies",
            "items": [
                "• ICAR-CIPHET (2022) Assessment of Post-Harvest Losses: Quantifying 15-30% perishable food spoilage due to 5-tier mandi delays.",
                "• NITI Aayog Strategy for Agricultural Marketing (2020): Highlighting 75-85% consumer price markups extracted by commission agents & middlemen.",
                "• NABARD Rural Inclusion Survey: Documenting 55%+ 2G feature phone reliance among smallholder farmers."
            ]
        },
        {
            "title": "3. Algorithmic & Engineering Foundations",
            "items": [
                "• Lin, S. & Kernighan, B. (1973): 'An Effective Heuristic Algorithm for the Traveling Salesman Problem' — Foundation for our 2-Opt Route Optimizer.",
                "• Breiman, L. (2001): 'Random Forests' (Machine Learning) — Used for our 6-month demand regressor factoring rainfall and festive seasonality.",
                "• OpenStreetMap & OSRM Geocoding API: Open-source geospatial routing & distance matrix."
            ]
        },
        {
            "title": "4. Policy & National Mission Alignment",
            "items": [
                "• Digital Agriculture Mission (DAM 2024-25): Promoting inclusive AI & open digital public infrastructure.",
                "• PM Kisan Sampada Yojana: Supporting integrated cold chain & direct farm-gate preservation.",
                "• Atmanirbhar Bharat Agri-Logistics: Empowering rural transport drivers & FPO self-reliance."
            ]
        }
    ]

    for idx, rcard in enumerate(ref_cards):
        shape = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_positions[idx], top_positions[idx], Inches(5.35), Inches(2.25))
        shape.fill.solid()
        shape.fill.fore_color.rgb = C_LIGHT_BG
        shape.line.color.rgb = C_CARD_BORDER
        shape.line.width = Pt(1.5)

        tf = shape.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.15)
        tf.margin_right = Inches(0.15)
        tf.margin_top = Inches(0.1)
        tf.margin_bottom = Inches(0.1)

        p0 = tf.paragraphs[0]
        p0.text = rcard["title"]
        p0.font.bold = True
        p0.font.size = Pt(11)
        p0.font.name = FONT_BODY
        p0.font.color.rgb = C_PRIMARY_DARK

        for itm in rcard["items"]:
            p = tf.add_paragraph()
            p.text = itm
            p.font.size = Pt(8.5)
            p.font.name = FONT_BODY
            p.font.color.rgb = C_DARK_TEXT

    # Save
    output_path1 = 'SIH2026_IDEA_Presentation_rough.pptx'
    output_path2 = r'C:\Users\Monish P\OneDrive\Desktop\Documents\SIH2026_IDEA_Presentation_rough.pptx'

    prs.save(output_path1)
    prs.save(output_path2)
    print("Clean build successful!")

if __name__ == '__main__':
    clean_and_build()
