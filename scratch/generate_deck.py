import os
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette (Crisp White Background Theme)
    WHITE = RGBColor(255, 255, 255)
    CARD_BG = RGBColor(248, 250, 252)          # Slate 50
    CARD_BORDER = RGBColor(226, 232, 240)      # Slate 200
    TEXT_PRIMARY = RGBColor(15, 23, 42)        # Slate 900
    TEXT_SECONDARY = RGBColor(51, 65, 85)      # Slate 700
    TEXT_MUTED = RGBColor(100, 116, 139)       # Slate 500
    BLUE_ACCENT = RGBColor(37, 99, 235)        # Blue 600
    INDIGO_ACCENT = RGBColor(79, 70, 229)      # Indigo 600
    GREEN_ACCENT = RGBColor(16, 149, 106)      # Emerald 600
    AMBER_ACCENT = RGBColor(217, 119, 6)       # Amber 600
    CODE_BG = RGBColor(241, 245, 249)          # Slate 100
    CODE_TEXT = RGBColor(15, 23, 42)           # Slate 900
    CODE_HEADER_BG = RGBColor(226, 232, 240)   # Slate 200

    IMG_DFD_L1 = r"C:/Users/abbas/.gemini/antigravity/brain/e45ec5a1-e2d4-49e3-8016-79e0dd351715/.user_uploaded/media_1793854573289_b830dc59.png"
    IMG_DFD_L0 = r"C:/Users/abbas/.gemini/antigravity/brain/e45ec5a1-e2d4-49e3-8016-79e0dd351715/.user_uploaded/media_1793854585541_530a8507.png"
    IMG_ERD = r"C:/Users/abbas/.gemini/antigravity/brain/e45ec5a1-e2d4-49e3-8016-79e0dd351715/.user_uploaded/media_1793854671250_a617a2e6.png"

    def apply_white_bg(slide):
        bg = slide.background
        fill = bg.fill
        fill.solid()
        fill.fore_color.rgb = WHITE

    def add_header(slide, badge, title, subtitle=None, slide_num=None):
        apply_white_bg(slide)
        
        # Section Category Badge
        bx = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(5.0), Inches(0.28))
        tf_b = bx.text_frame
        tf_b.word_wrap = True
        tf_b.margin_left = tf_b.margin_right = tf_b.margin_top = tf_b.margin_bottom = 0
        p_b = tf_b.paragraphs[0]
        p_b.text = badge.upper()
        p_b.font.name = "Calibri"
        p_b.font.size = Pt(10.5)
        p_b.font.bold = True
        p_b.font.color.rgb = BLUE_ACCENT

        # Title
        tx = slide.shapes.add_textbox(Inches(0.8), Inches(0.66), Inches(10.5), Inches(0.52))
        tf_t = tx.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = 0
        p_t = tf_t.paragraphs[0]
        p_t.text = title
        p_t.font.name = "Calibri"
        p_t.font.size = Pt(21)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_PRIMARY

        # Subtitle
        if subtitle:
            sx = slide.shapes.add_textbox(Inches(0.8), Inches(1.18), Inches(10.5), Inches(0.32))
            tf_s = sx.text_frame
            tf_s.word_wrap = True
            tf_s.margin_left = tf_s.margin_right = tf_s.margin_top = tf_s.margin_bottom = 0
            p_s = tf_s.paragraphs[0]
            p_s.text = subtitle
            p_s.font.name = "Calibri"
            p_s.font.size = Pt(11.5)
            p_s.font.color.rgb = TEXT_MUTED

        # Divider line
        div = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.56), Inches(11.733), Inches(0.012))
        div.fill.solid()
        div.fill.fore_color.rgb = CARD_BORDER
        div.line.color.rgb = CARD_BORDER

        # Footer
        if slide_num:
            fx = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(8.0), Inches(0.3))
            tf_f = fx.text_frame
            tf_f.margin_left = tf_f.margin_right = tf_f.margin_top = tf_f.margin_bottom = 0
            p_f = tf_f.paragraphs[0]
            p_f.text = "AI Interview Preparation Assistant  •  Syed Hasan Abbas & Srujan Shetty"
            p_f.font.name = "Calibri"
            p_f.font.size = Pt(9.5)
            p_f.font.color.rgb = TEXT_MUTED

            nx = slide.shapes.add_textbox(Inches(10.0), Inches(7.05), Inches(2.533), Inches(0.3))
            tf_n = nx.text_frame
            tf_n.margin_left = tf_n.margin_right = tf_n.margin_top = tf_n.margin_bottom = 0
            p_n = tf_n.paragraphs[0]
            p_n.alignment = PP_ALIGN.RIGHT
            p_n.text = f"{slide_num} / 12"
            p_n.font.name = "Calibri"
            p_n.font.size = Pt(9.5)
            p_n.font.bold = True
            p_n.font.color.rgb = BLUE_ACCENT

    def add_card_box(slide, left, top, width, height, bg=CARD_BG, border=CARD_BORDER):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg
        shape.line.color.rgb = border
        shape.line.width = Pt(1)
        return shape

    def add_code_panel(slide, left, top, width, height, filename, code_str):
        # Container shape
        container = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        container.fill.solid()
        container.fill.fore_color.rgb = CODE_BG
        container.line.color.rgb = CARD_BORDER
        container.line.width = Pt(1)

        # Header bar for code window
        head_bar = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, Inches(0.4))
        head_bar.fill.solid()
        head_bar.fill.fore_color.rgb = CODE_HEADER_BG
        head_bar.line.color.rgb = CARD_BORDER
        head_bar.line.width = Pt(1)

        # Window dots
        for i, dot_color in enumerate([RGBColor(239, 68, 68), RGBColor(245, 158, 11), RGBColor(16, 185, 129)]):
            dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, left + Inches(0.18 + i*0.2), top + Inches(0.12), Inches(0.12), Inches(0.12))
            dot.fill.solid()
            dot.fill.fore_color.rgb = dot_color
            dot.line.fill.background()

        # Filename label
        lbl_box = slide.shapes.add_textbox(left + Inches(0.85), top + Inches(0.08), width - Inches(1.0), Inches(0.25))
        tf_l = lbl_box.text_frame
        tf_l.margin_left = tf_l.margin_right = tf_l.margin_top = tf_l.margin_bottom = 0
        p_l = tf_l.paragraphs[0]
        p_l.text = filename
        p_l.font.name = "Consolas"
        p_l.font.size = Pt(9)
        p_l.font.bold = True
        p_l.font.color.rgb = TEXT_SECONDARY

        # Code content
        c_box = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.48), width - Inches(0.4), height - Inches(0.55))
        tf_c = c_box.text_frame
        tf_c.word_wrap = True
        tf_c.margin_left = tf_c.margin_right = tf_c.margin_top = tf_c.margin_bottom = 0
        p_c = tf_c.paragraphs[0]
        p_c.text = code_str
        p_c.font.name = "Consolas"
        p_c.font.size = Pt(8.5)
        p_c.font.color.rgb = CODE_TEXT

    # =========================================================================
    # SLIDE 1: Title Slide
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    apply_white_bg(s1)

    # Accent decorative top strip
    strip = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.8), Inches(1.8), Inches(0.08))
    strip.fill.solid()
    strip.fill.fore_color.rgb = BLUE_ACCENT
    strip.line.fill.background()

    # Category Pill
    pill = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.15), Inches(3.2), Inches(0.38))
    pill.fill.solid()
    pill.fill.fore_color.rgb = RGBColor(238, 242, 255)
    pill.line.color.rgb = RGBColor(199, 210, 254)
    tf_p = pill.text_frame
    p0 = tf_p.paragraphs[0]
    p0.text = "PROJECT PRESENTATION"
    p0.font.name = "Calibri"
    p0.font.size = Pt(10.5)
    p0.font.bold = True
    p0.font.color.rgb = BLUE_ACCENT
    p0.alignment = PP_ALIGN.CENTER

    # Main Title
    t_box = s1.shapes.add_textbox(Inches(0.8), Inches(1.75), Inches(11.733), Inches(1.3))
    tf_t = t_box.text_frame
    tf_t.word_wrap = True
    tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = 0
    p1 = tf_t.paragraphs[0]
    p1.text = "AI Interview Preparation Assistant"
    p1.font.name = "Calibri"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_PRIMARY

    p2 = tf_t.add_paragraph()
    p2.text = "An Intelligent Platform for Resume ATS Optimization, Adaptive Mock Interviews & Real-Time Fluency Analytics"
    p2.font.name = "Calibri"
    p2.font.size = Pt(15)
    p2.font.color.rgb = TEXT_MUTED

    # Student Cards Container
    # Card 1: Syed Hasan Abbas
    add_card_box(s1, Inches(0.8), Inches(3.4), Inches(5.6), Inches(2.1), bg=RGBColor(248, 250, 252), border=CARD_BORDER)
    c1_box = s1.shapes.add_textbox(Inches(1.1), Inches(3.6), Inches(5.0), Inches(1.7))
    tf_c1 = c1_box.text_frame
    tf_c1.word_wrap = True
    tf_c1.margin_left = tf_c1.margin_right = tf_c1.margin_top = tf_c1.margin_bottom = 0
    
    p = tf_c1.paragraphs[0]
    p.text = "PRESENTED BY"
    p.font.name = "Calibri"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT
    
    p = tf_c1.add_paragraph()
    p.text = "Syed Hasan Abbas"
    p.font.name = "Calibri"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY
    
    p = tf_c1.add_paragraph()
    p.text = "UUCMS ID: U18IW24S0186"
    p.font.name = "Calibri"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = TEXT_SECONDARY

    p = tf_c1.add_paragraph()
    p.text = "Dept. of Computer Science & Engineering"
    p.font.name = "Calibri"
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT_MUTED

    # Card 2: Srujan Shetty
    add_card_box(s1, Inches(6.9), Inches(3.4), Inches(5.6), Inches(2.1), bg=RGBColor(248, 250, 252), border=CARD_BORDER)
    c2_box = s1.shapes.add_textbox(Inches(7.2), Inches(3.6), Inches(5.0), Inches(1.7))
    tf_c2 = c2_box.text_frame
    tf_c2.word_wrap = True
    tf_c2.margin_left = tf_c2.margin_right = tf_c2.margin_top = tf_c2.margin_bottom = 0
    
    p = tf_c2.paragraphs[0]
    p.text = "PRESENTED BY"
    p.font.name = "Calibri"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT
    
    p = tf_c2.add_paragraph()
    p.text = "Srujan Shetty"
    p.font.name = "Calibri"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY
    
    p = tf_c2.add_paragraph()
    p.text = "UUCMS ID: U18IW24S0181"
    p.font.name = "Calibri"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = TEXT_SECONDARY

    p = tf_c2.add_paragraph()
    p.text = "Dept. of Computer Science & Engineering"
    p.font.name = "Calibri"
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT_MUTED

    # Tech Stack Footer Banner
    stack_box = s1.shapes.add_textbox(Inches(0.8), Inches(6.0), Inches(11.733), Inches(0.6))
    tf_st = stack_box.text_frame
    tf_st.word_wrap = True
    tf_st.margin_left = tf_st.margin_right = tf_st.margin_top = tf_st.margin_bottom = 0
    p = tf_st.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = "Technology Stack"
    p.font.name = "Calibri"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = TEXT_MUTED

    p = tf_st.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    p.text = "Next.js 14 (App Router)  •  PostgreSQL & Prisma ORM  •  Google Gemini AI  •  Web Speech API  •  Tailwind CSS  •  NextAuth.js"
    p.font.name = "Calibri"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = TEXT_SECONDARY

    # =========================================================================
    # SLIDE 2: 1. Introduction
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "1. Introduction", "Background, Problem Statement & Proposed Solution", "Understanding the challenges in interview preparation and our integrated AI approach", 2)

    # Left Column: Problem Statement
    add_card_box(s2, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg=CARD_BG, border=CARD_BORDER)
    p_box = s2.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(5.0), Inches(4.5))
    tf_p = p_box.text_frame
    tf_p.word_wrap = True
    tf_p.margin_left = tf_p.margin_right = tf_p.margin_top = tf_p.margin_bottom = 0

    p = tf_p.paragraphs[0]
    p.text = "⚠  The Problem Landscape"
    p.font.name = "Calibri"
    p.font.size = Pt(15.5)
    p.font.bold = True
    p.font.color.rgb = RGBColor(190, 18, 60)

    points_problem = [
        ("Fragmented Preparation", "Candidates jump across disconnected portals: static PDF question banks, uncalibrated resume checkers, and isolated quizzes with zero unified feedback."),
        ("Static & Robotic Question Banks", "Conventional tools follow rigid, predetermined scripts. They do not listen, probe deeper into candidate replies, or ask dynamic follow-ups."),
        ("No Behavioral & Speech Feedback", "Interviews test communication pacing, pause duration, and filler word frequency, yet standard preparation platforms completely ignore vocal delivery."),
        ("High Cost & Low Availability of Human Mocks", "Scheduling live 1-on-1 human mock interviews is cost-prohibitive, stressful, and impossible to scale on-demand.")
    ]
    for title, desc in points_problem:
        p = tf_p.add_paragraph()
        p.text = f"•  {title}: "
        p.font.name = "Calibri"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = TEXT_SECONDARY

    # Right Column: Proposed Solution
    add_card_box(s2, Inches(6.9), Inches(1.8), Inches(5.6), Inches(4.9), bg=RGBColor(240, 253, 244), border=RGBColor(187, 247, 208))
    s_box = s2.shapes.add_textbox(Inches(7.2), Inches(2.0), Inches(5.0), Inches(4.5))
    tf_s = s_box.text_frame
    tf_s.word_wrap = True
    tf_s.margin_left = tf_s.margin_right = tf_s.margin_top = tf_s.margin_bottom = 0

    p = tf_s.paragraphs[0]
    p.text = "✓  Our Intelligent Solution"
    p.font.name = "Calibri"
    p.font.size = Pt(15.5)
    p.font.bold = True
    p.font.color.rgb = GREEN_ACCENT

    points_solution = [
        ("End-to-End Preparation Lifecycle", "Bridges resume ATS screening, tailored mock interviews, and automated post-session feedback in a single unified dashboard."),
        ("Multi-Modal Adaptive AI Engine", "Supports real-time voice streaming and text chat. Dynamically branches conversation, probes trade-offs, and scales question difficulty."),
        ("Granular Speech & Fluency Metrics", "Measures speaking rate (WPM), latency before speaking, pause frequency, and filler words (um, uh, like) to enhance candidate poise."),
        ("Rubric Evaluation & Synthesis", "Evaluates every response against industry competencies and delivers a quantitative report with YouTube video learning links.")
    ]
    for title, desc in points_solution:
        p = tf_s.add_paragraph()
        p.text = f"•  {title}: "
        p.font.name = "Calibri"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = TEXT_SECONDARY

    # =========================================================================
    # SLIDE 3: 2. Objectives
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "2. Objectives", "Core Project Objectives & Engineering Goals", "Key technical objectives driving the architectural design and system implementation", 3)

    objectives = [
        ("1", "Conversational Mock Interviews", "Develop an adaptive conversation engine across 4 interview tracks (Technical, HR, Managerial, and Aptitude) with real-time SSE token streaming and contextual follow-up probing."),
        ("2", "Multi-Modal Voice & Text Support", "Implement real-time Speech-to-Text (STT) and Text-to-Speech (TTS) integration with voice activity detection (VAD) to replicate natural dialogue flow with human interviewer personas."),
        ("3", "Speech & Fluency Analytics", "Track and quantify real-time communication metrics including words-per-minute (WPM), response latency, silent pause duration, and linguistic filler words to provide actionable delivery critique."),
        ("4", "Rubric-Based Evaluation Pipeline", "Implement an asynchronous background evaluation worker that scores candidate answers against structured competency pillars and scales interview difficulty (Junior to Lead)."),
        ("5", "Resume ATS Screening & Optimization", "Provide intelligent resume parsing with keyword gap analysis, format validation, and ATS score computation against targeted job descriptions."),
        ("6", "Security, Privacy & Decoupled Architecture", "Deliver enterprise security with TOTP 2FA, zero-IP logging, isolated admin dashboards, and a provider-agnostic LLM interface allowing hot-swapping between Gemini and Groq.")
    ]

    card_w = Inches(3.68)
    card_h = Inches(2.3)
    gap_x = Inches(0.34)
    gap_y = Inches(0.28)
    start_x = Inches(0.8)
    start_y = Inches(1.8)

    for i, (num, title, desc) in enumerate(objectives):
        col = i % 3
        row = i // 3
        pos_x = start_x + col * (card_w + gap_x)
        pos_y = start_y + row * (card_h + gap_y)

        add_card_box(s3, pos_x, pos_y, card_w, card_h, bg=CARD_BG, border=CARD_BORDER)

        # Number badge
        num_circ = s3.shapes.add_shape(MSO_SHAPE.OVAL, pos_x + Inches(0.2), pos_y + Inches(0.2), Inches(0.35), Inches(0.35))
        num_circ.fill.solid()
        num_circ.fill.fore_color.rgb = BLUE_ACCENT
        num_circ.line.fill.background()
        tf_nc = num_circ.text_frame
        p = tf_nc.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        p.text = num
        p.font.name = "Calibri"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = WHITE

        # Content
        ob_box = s3.shapes.add_textbox(pos_x + Inches(0.68), pos_y + Inches(0.18), card_w - Inches(0.88), card_h - Inches(0.3))
        tf_ob = ob_box.text_frame
        tf_ob.word_wrap = True
        tf_ob.margin_left = tf_ob.margin_right = tf_ob.margin_top = tf_ob.margin_bottom = 0

        p = tf_ob.paragraphs[0]
        p.text = title
        p.font.name = "Calibri"
        p.font.size = Pt(12.5)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY

        p = tf_ob.add_paragraph()
        p.text = desc
        p.font.name = "Calibri"
        p.font.size = Pt(10)
        p.font.color.rgb = TEXT_SECONDARY

    # =========================================================================
    # SLIDE 4: 3. ER Diagram
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "3. ER Diagram", "Entity-Relationship Data Model", "Relational database schema representing users, interview sessions, turns, metrics, and reports", 4)

    # Left: Embedded Exact ER Diagram Image (754 x 582, ratio 1.295)
    img_w_erd = Inches(6.3)
    img_box_erd = s4.shapes.add_picture(IMG_ERD, Inches(0.8), Inches(1.8), width=img_w_erd)

    # Right: Entity Description Card
    add_card_box(s4, Inches(7.4), Inches(1.8), Inches(5.133), Inches(5.0), bg=CARD_BG, border=CARD_BORDER)
    er_box = s4.shapes.add_textbox(Inches(7.65), Inches(1.95), Inches(4.633), Inches(4.7))
    tf_er = er_box.text_frame
    tf_er.word_wrap = True
    tf_er.margin_left = tf_er.margin_right = tf_er.margin_top = tf_er.margin_bottom = 0

    p = tf_er.paragraphs[0]
    p.text = "Database Entities & Cardinalities"
    p.font.name = "Calibri"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT

    entities = [
        ("USER", "Stores account credentials, profile settings, domain track, and TOTP 2FA secret (1:N with Session & Resume)."),
        ("INTERVIEW_SESSION", "Core session state tracking interview type (HR | Tech | Mgr), modality (Text | Voice), and aggregate score."),
        ("INTERVIEW_MESSAGE", "Maintains ordered conversational turn history between candidate (role: user) and interviewer (role: assistant)."),
        ("RESPONSE_ANALYSIS", "Captures per-turn vocal metrics including wordsPerMinute, fillerCount, latency, and pause frequency."),
        ("INTERVIEW_REPORT", "1:1 relation with completed session containing final overallScore, executive summary, and rubric pillar breakdowns."),
        ("RESUME & ATS_SCAN_LOG", "Stores parsed resume data, targeted job description matching scores, and keyword recommendation logs.")
    ]

    for ent, desc in entities:
        p = tf_er.add_paragraph()
        p.text = f"•  {ent}: "
        p.font.name = "Calibri"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = TEXT_SECONDARY

    # =========================================================================
    # SLIDE 5: 4. Data Flow Diagram (DFD) — Level 0 (Context Diagram)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "4. Data Flow Diagram (DFD)", "DFD Level 0 — Context Level Diagram", "High-level boundary model illustrating interactions between external entities and InterviewAssistant", 5)

    # Top: Embedded Level 0 DFD Image (1024 x 252, ratio 4.06)
    img_w_l0 = Inches(11.733)
    img_box_l0 = s5.shapes.add_picture(IMG_DFD_L0, Inches(0.8), Inches(1.8), width=img_w_l0)

    # Bottom: 4 Structural Entity Cards
    dfd0_cards = [
        ("Candidate", "Active External Entity", "Inputs resume, target job description, domain track settings, and voice/text answers. Receives adaptive questions, pacing flags, and session status."),
        ("Microphone / Audio", "Streaming External Entity", "Captures raw voice stream, audio frames, and silent pause intervals, providing raw signals for transcription and fluency computation."),
        ("AI Provider (Gemini / LLM)", "Cognitive External Entity", "Processes conversation turn context, rubric criteria, and candidate responses. Returns generated questions, rubric scores, and synthesis deltas."),
        ("Report Target", "Output Sinks", "Delivers finalized structured evaluations, ATS match percentage, performance dashboards, and exportable PDF interview diagnostic reports.")
    ]

    card_w_l0 = Inches(2.75)
    card_h_l0 = Inches(2.0)
    gap_l0 = Inches(0.24)
    y_l0 = Inches(4.8)

    for i, (title, subtitle, desc) in enumerate(dfd0_cards):
        x = Inches(0.8) + i * (card_w_l0 + gap_l0)
        add_card_box(s5, x, y_l0, card_w_l0, card_h_l0, bg=CARD_BG, border=CARD_BORDER)

        cb = s5.shapes.add_textbox(x + Inches(0.18), y_l0 + Inches(0.15), card_w_l0 - Inches(0.36), card_h_l0 - Inches(0.25))
        tf_cb = cb.text_frame
        tf_cb.word_wrap = True
        tf_cb.margin_left = tf_cb.margin_right = tf_cb.margin_top = tf_cb.margin_bottom = 0

        p = tf_cb.paragraphs[0]
        p.text = title
        p.font.name = "Calibri"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = BLUE_ACCENT

        p = tf_cb.add_paragraph()
        p.text = subtitle.upper()
        p.font.name = "Calibri"
        p.font.size = Pt(8.5)
        p.font.bold = True
        p.font.color.rgb = TEXT_MUTED

        p = tf_cb.add_paragraph()
        p.text = desc
        p.font.name = "Calibri"
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_SECONDARY

    # =========================================================================
    # SLIDE 6: 4. Data Flow Diagram (DFD) — Level 1 (Detailed Flow)
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "4. Data Flow Diagram (DFD)", "DFD Level 1 — Process Decomposition & Data Stores", "Detailed data flow between system processes, data stores (D1–D4), candidate, and AI Proxy", 6)

    # Left: Embedded Level 1 DFD Image (scaled to 6.4 in width, height 4.81 in)
    img_w_l1 = Inches(6.4)
    img_box_l1 = s6.shapes.add_picture(IMG_DFD_L1, Inches(0.8), Inches(1.8), width=img_w_l1)

    # Right: Description of the 6 Processes & 4 Data Stores
    add_card_box(s6, Inches(7.5), Inches(1.8), Inches(5.033), Inches(5.0), bg=CARD_BG, border=CARD_BORDER)
    l1_box = s6.shapes.add_textbox(Inches(7.75), Inches(1.95), Inches(4.533), Inches(4.7))
    tf_l1 = l1_box.text_frame
    tf_l1.word_wrap = True
    tf_l1.margin_left = tf_l1.margin_right = tf_l1.margin_top = tf_l1.margin_bottom = 0

    p = tf_l1.paragraphs[0]
    p.text = "Decomposition of Processes & Stores"
    p.font.name = "Calibri"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT

    l1_items = [
        ("1.0 Configure Session & ATS Scan", "Parses candidate resume/JD, runs keyword gap analysis, and populates data store D1 (resumes_and_jds)."),
        ("2.0 Capture Audio & Transcribe", "Ingests voice stream from microphone, generates text transcript, and extracts audio frames with timestamps."),
        ("3.0 Adaptive Question Engine", "Consults candidate history to prevent repetition and queries AI Proxy to formulate the next contextual interview question."),
        ("4.0 Speech & Fluency Analysis", "Calculates words-per-minute (WPM), pause count, and filler frequencies, writing to D3 (voice_metrics_logs)."),
        ("5.0 Turn Scoring & Evaluation", "Evaluates candidate answer against rubric benchmarks and writes turn scores to D2 (interview_sessions_and_turns)."),
        ("6.0 Synthesize Final Report", "Combines transcripts and fluency logs to synthesize performance reports in D4 and generate PDF/dashboards.")
    ]

    for proc, desc in l1_items:
        p = tf_l1.add_paragraph()
        p.text = f"•  {proc}: "
        p.font.name = "Calibri"
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = TEXT_SECONDARY

    # =========================================================================
    # SLIDE 7: 5. Module Description (Working Code) — Adaptive Interview Engine
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "5. Module Description (Working Code)", "Module 1: Adaptive Interview Engine & Intent Orchestrator", "State-driven conversation engine that classifies candidate intent and adapts dialogue dynamically", 7)

    # Left: Explanation Card
    add_card_box(s7, Inches(0.8), Inches(1.8), Inches(4.8), Inches(5.0), bg=CARD_BG, border=CARD_BORDER)
    m1_box = s7.shapes.add_textbox(Inches(1.0), Inches(1.95), Inches(4.4), Inches(4.7))
    tf_m1 = m1_box.text_frame
    tf_m1.word_wrap = True
    tf_m1.margin_left = tf_m1.margin_right = tf_m1.margin_top = tf_m1.margin_bottom = 0

    p = tf_m1.paragraphs[0]
    p.text = "Engine Logic & State Machine"
    p.font.name = "Calibri"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT

    m1_points = [
        ("Intent Classification", "Detects greetings, introductions, meta-instructions (e.g. 'can you speak faster?'), requests to end, or substantive answers."),
        ("Contextual Action Branching", "Executes actions like DRILL_DOWN, CHALLENGE_TRADEOFF, or ADVANCE_PILLAR based on candidate response quality."),
        ("Anti-Repetition History", "Checks conversation transcripts against previously covered concepts to ensure fresh, progressive inquiry."),
        ("Streaming AI Delivery", "Server-Sent Events (SSE) stream the AI's tokens word-by-word with realistic human interviewer personas (Alex Chen, Sarah Martinez).")
    ]
    for t, d in m1_points:
        p = tf_m1.add_paragraph()
        p.text = f"•  {t}: "
        p.font.name = "Calibri"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = TEXT_SECONDARY

    # Right: Working Code Panel
    code1 = """export type InterviewAction =
  | "OPEN_INTERVIEW"       | "HANDLE_GREETING"
  | "DRILL_DOWN"           | "CHALLENGE_TRADEOFF"
  | "ADVANCE_PILLAR"       | "CONCLUDE_ROUND";

export function determineNextAction(
  state: InterviewState, 
  candidateMessage: string
): { action: InterviewAction; reason: string } {
  const classification = classifyCandidateMessage(candidateMessage);
  
  if (classification.isGreeting) {
    return { action: "HANDLE_GREETING", reason: "GREETING_DETECTED" };
  }
  if (classification.isSubstantive) {
    // Check pillar progression depth
    if (state.turnsInCurrentPillar >= 2) {
      return { action: "ADVANCE_PILLAR", reason: "PILLAR_PROGRESSION_ADVANCE" };
    }
    return { action: "DRILL_DOWN", reason: "SUBSTANTIVE_PROBE_DEPTH" };
  }
  return { action: "PROMPT_FOR_SUBSTANCE", reason: "NON_SUBSTANTIVE_REPROMPT" };
}"""
    add_code_panel(s7, Inches(5.8), Inches(1.8), Inches(6.733), Inches(5.0), "TypeScript • services/interview-engine.ts", code1)

    # =========================================================================
    # SLIDE 8: 5. Module Description (Working Code) — Speech & Fluency Analysis
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "5. Module Description (Working Code)", "Module 2: Speech & Fluency Analysis", "Real-time acoustic and linguistic analysis measuring pace, pauses, and disfluency", 8)

    # Left: Explanation Card
    add_card_box(s8, Inches(0.8), Inches(1.8), Inches(4.8), Inches(5.0), bg=CARD_BG, border=CARD_BORDER)
    m2_box = s8.shapes.add_textbox(Inches(1.0), Inches(1.95), Inches(4.4), Inches(4.7))
    tf_m2 = m2_box.text_frame
    tf_m2.word_wrap = True
    tf_m2.margin_left = tf_m2.margin_right = tf_m2.margin_top = tf_m2.margin_bottom = 0

    p = tf_m2.paragraphs[0]
    p.text = "Fluency Metrics Computation"
    p.font.name = "Calibri"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT

    m2_points = [
        ("Words Per Minute (WPM)", "Calculates speaking speed against standard conversational targets (ideal: 130–160 WPM). Flags rushing or hesitant delivery."),
        ("Response Latency", "Measures the silent hesitation window between interviewer question completion and candidate's first speech utterance."),
        ("Filler Word Tracking", "Regex scanning for verbal crutches ('um', 'uh', 'like', 'you know', 'basically') and computes fillers-per-100-words rate."),
        ("Disfluency & Structure", "Detects repeated words, false starts, and categorizes overall communication structure (Minimal, Concise, Balanced, Verbose).")
    ]
    for t, d in m2_points:
        p = tf_m2.add_paragraph()
        p.text = f"•  {t}: "
        p.font.name = "Calibri"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = TEXT_SECONDARY

    # Right: Working Code Panel
    code2 = """export function calculateSpeakingRate(
  wordCount: number, 
  speakingDurationSec: number
): SpeakingRateMetrics {
  const wordsPerMinute = speakingDurationSec > 0
    ? Math.round((wordCount / speakingDurationSec) * 60)
    : null;
  return { wordCount, speakingDurationSec, wordsPerMinute };
}

const FILLER_PATTERNS = [
  /\\b(um|uh|er|ah)\\b/gi,
  /\\b(like|you know|basically|actually)\\b/gi
];

export function analyzeFillers(text: string, wordCount: number): FillerMetrics {
  let count = 0;
  FILLER_PATTERNS.forEach(regex => {
    const matches = text.match(regex);
    if (matches) count += matches.length;
  });
  const fillerRate = wordCount > 0 
    ? Number(((count / wordCount) * 100).toFixed(2)) 
    : 0;
  return { fillerCount: count, fillerRate };
}"""
    add_code_panel(s8, Inches(5.8), Inches(1.8), Inches(6.733), Inches(5.0), "TypeScript • services/response-analyzer.ts", code2)

    # =========================================================================
    # SLIDE 9: 5. Module Description (Working Code) — Rubric Evaluation & Synthesis
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_header(s9, "5. Module Description (Working Code)", "Module 3: Turn Evaluation & Performance Synthesis", "Asynchronous rubric evaluation worker and LLM qualitative report synthesizer", 9)

    # Left: Explanation Card
    add_card_box(s9, Inches(0.8), Inches(1.8), Inches(4.8), Inches(5.0), bg=CARD_BG, border=CARD_BORDER)
    m3_box = s9.shapes.add_textbox(Inches(1.0), Inches(1.95), Inches(4.4), Inches(4.7))
    tf_m3 = m3_box.text_frame
    tf_m3.word_wrap = True
    tf_m3.margin_left = tf_m3.margin_right = tf_m3.margin_top = tf_m3.margin_bottom = 0

    p = tf_m3.paragraphs[0]
    p.text = "Evaluation Pipeline & Reporting"
    p.font.name = "Calibri"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT

    m3_points = [
        ("Zod Rubric Validation", "Enforces strict mathematical evaluation schemas (0–100 score, weight, evidence snippet, constructive feedback) per evaluated turn."),
        ("Transactional Outbox Pattern", "Decouples real-time conversation from LLM scoring using background `EvaluationJob` queue with automatic retry workers."),
        ("Adaptive Difficulty Scaling", "Evaluates candidate performance signals to dynamically adjust difficulty tier (Junior → Mid → Senior → Lead)."),
        ("Holistic Final Report", "Synthesizes competency scores, speech metrics, executive summary, cited quote evidence, and YouTube learning recommendations.")
    ]
    for t, d in m3_points:
        p = tf_m3.add_paragraph()
        p.text = f"•  {t}: "
        p.font.name = "Calibri"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = TEXT_SECONDARY

    # Right: Working Code Panel
    code3 = """export const RubricScoreSchema = z.object({
  dimension: z.string().min(1),
  score: z.number().int().min(0).max(100),
  weight: z.number().min(0).max(1).default(1),
  evidenceSnippet: z.string().default(""),
  feedback: z.string().default(""),
});

export async function evaluateTurn(
  sessionContext: SessionContext, 
  turn: TurnInput
): Promise<TurnEvaluationResult> {
  const prompt = buildRubricPrompt(sessionContext, turn);
  const rawResponse = await llmProvider.generate(prompt);
  const parsed = TurnEvaluationSchema.parse(JSON.parse(rawResponse));
  
  // Update pillar mastery & adaptive difficulty
  const nextTier = computeAdaptiveDifficulty(parsed.overallScore);
  return { ...parsed, nextDifficulty: nextTier };
}"""
    add_code_panel(s9, Inches(5.8), Inches(1.8), Inches(6.733), Inches(5.0), "TypeScript • services/evaluator.ts", code3)

    # =========================================================================
    # SLIDE 10: 6. Conclusion
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    add_header(s10, "6. Conclusion", "Project Summary & Key Engineering Milestones", "Review of accomplishments, technical highlights, and system impact", 10)

    # 4 Highlights Cards
    cards_c = [
        ("Conversational Realism", "Replaced rigid question forms with genuine, thread-woven AI conversations that listen, probe edge cases, and adapt dynamically to candidate input.", BLUE_ACCENT),
        ("Multi-Modal Speech Intelligence", "Integrated real-time speech recognition, latency tracking, and pause analysis, providing vital behavioral feedback absent in typical platforms.", INDIGO_ACCENT),
        ("Enterprise Architecture & Security", "Engineered provider-agnostic LLM orchestration, PostgreSQL persistence via Prisma, TOTP 2FA, zero-IP logging, and isolated admin dashboards.", GREEN_ACCENT),
        ("Complete End-to-End Value", "Successfully connected resume ATS scanning, 4 interview tracks (Tech, HR, Mgr, Aptitude), automated scoring, and curated YouTube learning resources.", AMBER_ACCENT)
    ]

    cw_c = Inches(5.7)
    ch_c = Inches(2.2)
    start_x_c = Inches(0.8)
    gap_x_c = Inches(0.333)

    for i, (title, desc, color) in enumerate(cards_c):
        col = i % 2
        row = i // 2
        px = start_x_c + col * (cw_c + gap_x_c)
        py = Inches(1.8) + row * (ch_c + Inches(0.25))

        add_card_box(s10, px, py, cw_c, ch_c, bg=CARD_BG, border=CARD_BORDER)

        cb = s10.shapes.add_textbox(px + Inches(0.25), py + Inches(0.2), cw_c - Inches(0.5), ch_c - Inches(0.35))
        tf_cb = cb.text_frame
        tf_cb.word_wrap = True
        tf_cb.margin_left = tf_cb.margin_right = tf_cb.margin_top = tf_cb.margin_bottom = 0

        p = tf_cb.paragraphs[0]
        p.text = f"✓  {title}"
        p.font.name = "Calibri"
        p.font.size = Pt(13.5)
        p.font.bold = True
        p.font.color.rgb = color

        p = tf_cb.add_paragraph()
        p.text = desc
        p.font.name = "Calibri"
        p.font.size = Pt(10.5)
        p.font.color.rgb = TEXT_SECONDARY

    # Bottom Deployment Card
    add_card_box(s10, Inches(0.8), Inches(5.8), Inches(11.733), Inches(0.9), bg=RGBColor(238, 242, 255), border=RGBColor(199, 210, 254))
    dp_box = s10.shapes.add_textbox(Inches(1.0), Inches(5.92), Inches(11.333), Inches(0.68))
    tf_dp = dp_box.text_frame
    tf_dp.word_wrap = True
    tf_dp.margin_left = tf_dp.margin_right = tf_dp.margin_top = tf_dp.margin_bottom = 0

    p = tf_dp.paragraphs[0]
    p.text = "Deployment & Live Production"
    p.font.name = "Calibri"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT

    p = tf_dp.add_paragraph()
    p.text = "Deployed live on Vercel at https://ai-intweview-preparation-assistant.vercel.app/ backed by Supabase PostgreSQL and Google Gemini AI."
    p.font.name = "Calibri"
    p.font.size = Pt(10.5)
    p.font.color.rgb = TEXT_PRIMARY

    # =========================================================================
    # SLIDE 11: 7. Future Enhancements
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    add_header(s11, "7. Future Enhancements", "System Evolution & Feature Roadmap", "Strategic roadmap for scaling functionality, AI intelligence, and institutional adoption", 11)

    future_items = [
        ("Short Term", "Video & Computer Vision Analysis", "Integrate WebRTC video capture with facial expression, gaze stability, and posture analysis to simulate full video panel interviews."),
        ("Short Term", "Acoustic Vocal Prosody Scoring", "Upgrade from text-based silence checks to acoustic neural models measuring vocal tremor, pitch variation, and genuine spoken confidence."),
        ("Medium Term", "Multi-Language Mock Interviews", "Extend the NLP prompts and STT/TTS pipeline to support mock interviews in regional Indian languages (Hindi, Kannada) and international tongues."),
        ("Medium Term", "AI-Powered Resume Transformation", "Move from ATS diagnostics to automated resume rewriting, generating bullet points tailored to target job descriptions with quantifiable impacts."),
        ("Long Term", "Embedded Code Execution (Judge0)", "Expand the Monaco code editor into a full-fledged sandboxed IDE with Judge0 supporting multi-language compilation and automated test cases."),
        ("Long Term", "Campus Placement Cell Portal", "White-label portal for college placement drives with student cohort management, placement readiness scores, and recruiter analytics.")
    ]

    card_w_f = Inches(3.68)
    card_h_f = Inches(2.3)
    gap_x_f = Inches(0.34)
    gap_y_f = Inches(0.28)
    start_x_f = Inches(0.8)
    start_y_f = Inches(1.8)

    for i, (phase, title, desc) in enumerate(future_items):
        col = i % 3
        row = i // 3
        px = start_x_f + col * (card_w_f + gap_x_f)
        py = start_y_f + row * (card_h_f + gap_y_f)

        add_card_box(s11, px, py, card_w_f, card_h_f, bg=CARD_BG, border=CARD_BORDER)

        fb = s11.shapes.add_textbox(px + Inches(0.2), py + Inches(0.18), card_w_f - Inches(0.4), card_h_f - Inches(0.3))
        tf_fb = fb.text_frame
        tf_fb.word_wrap = True
        tf_fb.margin_left = tf_fb.margin_right = tf_fb.margin_top = tf_fb.margin_bottom = 0

        p = tf_fb.paragraphs[0]
        p.text = phase.upper()
        p.font.name = "Calibri"
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = BLUE_ACCENT

        p = tf_fb.add_paragraph()
        p.text = title
        p.font.name = "Calibri"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = TEXT_PRIMARY

        p = tf_fb.add_paragraph()
        p.text = desc
        p.font.name = "Calibri"
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_SECONDARY

    # =========================================================================
    # SLIDE 12: Thank You!
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    apply_white_bg(s12)

    # Accent decorative strip
    strip12 = s12.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(5.666), Inches(1.0), Inches(2.0), Inches(0.08))
    strip12.fill.solid()
    strip12.fill.fore_color.rgb = BLUE_ACCENT
    strip12.line.fill.background()

    # Main "Thank You!"
    ty_box = s12.shapes.add_textbox(Inches(0.8), Inches(1.4), Inches(11.733), Inches(1.2))
    tf_ty = ty_box.text_frame
    tf_ty.word_wrap = True
    tf_ty.margin_left = tf_ty.margin_right = tf_ty.margin_top = tf_ty.margin_bottom = 0

    p = tf_ty.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = "Thank You!"
    p.font.name = "Calibri"
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY

    p = tf_ty.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    p.text = "AI Interview Preparation Assistant  •  Questions & Answers"
    p.font.name = "Calibri"
    p.font.size = Pt(16)
    p.font.color.rgb = TEXT_MUTED

    # Presenter Information Cards
    # Syed Hasan Abbas
    add_card_box(s12, Inches(2.0), Inches(3.0), Inches(4.4), Inches(1.8), bg=CARD_BG, border=CARD_BORDER)
    p1_box = s12.shapes.add_textbox(Inches(2.2), Inches(3.2), Inches(4.0), Inches(1.4))
    tf_p1 = p1_box.text_frame
    tf_p1.word_wrap = True
    tf_p1.margin_left = tf_p1.margin_right = tf_p1.margin_top = tf_p1.margin_bottom = 0

    p = tf_p1.paragraphs[0]
    p.text = "Syed Hasan Abbas"
    p.font.name = "Calibri"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY

    p = tf_p1.add_paragraph()
    p.text = "UUCMS ID: U18IW24S0186"
    p.font.name = "Calibri"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT

    p = tf_p1.add_paragraph()
    p.text = "abbassyedhassa786@gmail.com"
    p.font.name = "Calibri"
    p.font.size = Pt(10.5)
    p.font.color.rgb = TEXT_MUTED

    # Srujan Shetty
    add_card_box(s12, Inches(6.933), Inches(3.0), Inches(4.4), Inches(1.8), bg=CARD_BG, border=CARD_BORDER)
    p2_box = s12.shapes.add_textbox(Inches(7.133), Inches(3.2), Inches(4.0), Inches(1.4))
    tf_p2 = p2_box.text_frame
    tf_p2.word_wrap = True
    tf_p2.margin_left = tf_p2.margin_right = tf_p2.margin_top = tf_p2.margin_bottom = 0

    p = tf_p2.paragraphs[0]
    p.text = "Srujan Shetty"
    p.font.name = "Calibri"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY

    p = tf_p2.add_paragraph()
    p.text = "UUCMS ID: U18IW24S0181"
    p.font.name = "Calibri"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = BLUE_ACCENT

    p = tf_p2.add_paragraph()
    p.text = "Dept. of Computer Science & Engineering"
    p.font.name = "Calibri"
    p.font.size = Pt(10.5)
    p.font.color.rgb = TEXT_MUTED

    # Live Project Link Card
    add_card_box(s12, Inches(2.0), Inches(5.1), Inches(9.333), Inches(1.3), bg=RGBColor(240, 253, 244), border=RGBColor(187, 247, 208))
    live_box = s12.shapes.add_textbox(Inches(2.2), Inches(5.25), Inches(8.933), Inches(1.0))
    tf_l = live_box.text_frame
    tf_l.word_wrap = True
    tf_l.margin_left = tf_l.margin_right = tf_l.margin_top = tf_l.margin_bottom = 0

    p = tf_l.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = "PROJECT LINKS & DEPLOYMENT"
    p.font.name = "Calibri"
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = GREEN_ACCENT

    p = tf_l.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    p.text = "Live Web Application: https://ai-intweview-preparation-assistant.vercel.app/"
    p.font.name = "Calibri"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY

    p = tf_l.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    p.text = "GitHub: hassan-abbas06  •  Database: Supabase PostgreSQL  •  AI: Google Gemini API"
    p.font.name = "Calibri"
    p.font.size = Pt(10.5)
    p.font.color.rgb = TEXT_SECONDARY

    # Save presentation
    prs.save(output_path)
    print(f"Presentation successfully saved to: {output_path} (Slide count: {len(prs.slides)})")

if __name__ == "__main__":
    out_file = r"D:\College\Project\AI Interview Preparation assistant2\AI_Interview_Preparation_Assistant.pptx"
    create_deck(out_file)
