import os
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# Initialize Presentation
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Color Palette (White background theme)
BG_WHITE = RGBColor(255, 255, 255)
BG_CARD = RGBColor(248, 250, 252)       # Slate 50
BORDER_COLOR = RGBColor(226, 232, 240)  # Slate 200
PRIMARY = RGBColor(15, 23, 42)          # Slate 900
SECONDARY = RGBColor(51, 65, 85)        # Slate 700
MUTED = RGBColor(100, 116, 139)         # Slate 500
ACCENT_BLUE = RGBColor(37, 99, 235)     # Blue 600
ACCENT_INDIGO = RGBColor(79, 70, 229)   # Indigo 600
ACCENT_GREEN = RGBColor(22, 101, 52)    # Green 800
BG_CODE = RGBColor(241, 245, 249)       # Slate 100
CODE_TEXT = RGBColor(30, 41, 59)        # Slate 800

IMG_DFD_L1 = r"C:/Users/abbas/.gemini/antigravity/brain/e45ec5a1-e2d4-49e3-8016-79e0dd351715/.user_uploaded/media_1793854573289_b830dc59.png"
IMG_DFD_L0 = r"C:/Users/abbas/.gemini/antigravity/brain/e45ec5a1-e2d4-49e3-8016-79e0dd351715/.user_uploaded/media_1793854585541_530a8507.png"
IMG_ERD = r"C:/Users/abbas/.gemini/antigravity/brain/e45ec5a1-e2d4-49e3-8016-79e0dd351715/.user_uploaded/media_1793854671250_a617a2e6.png"

def set_slide_background(slide):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = BG_WHITE

def add_header(slide, section_tag, title_text, subtitle_text=None, slide_num=None):
    set_slide_background(slide)
    
    # Section Tag Badge
    badge_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(4.0), Inches(0.35))
    tf_b = badge_box.text_frame
    tf_b.word_wrap = True
    tf_b.margin_left = tf_b.margin_right = tf_b.margin_top = tf_b.margin_bottom = 0
    p_b = tf_b.paragraphs[0]
    p_b.text = section_tag.upper()
    p_b.font.name = "Calibri"
    p_b.font.size = Pt(11)
    p_b.font.bold = True
    p_b.font.color.rgb = ACCENT_BLUE

    # Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.72), Inches(10.5), Inches(0.55))
    tf_t = title_box.text_frame
    tf_t.word_wrap = True
    tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = 0
    p_t = tf_t.paragraphs[0]
    p_t.text = title_text
    p_t.font.name = "Calibri"
    p_t.font.size = Pt(22)
    p_t.font.bold = True
    p_t.font.color.rgb = PRIMARY

    # Subtitle
    if subtitle_text:
        sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.28), Inches(10.5), Inches(0.35))
        tf_s = sub_box.text_frame
        tf_s.word_wrap = True
        tf_s.margin_left = tf_s.margin_right = tf_s.margin_top = tf_s.margin_bottom = 0
        p_s = tf_s.paragraphs[0]
        p_s.text = subtitle_text
        p_s.font.name = "Calibri"
        p_s.font.size = Pt(12)
        p_s.font.color.rgb = MUTED

    # Header Divider Line
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.68), Inches(11.733), Inches(0.015))
    line.fill.solid()
    line.fill.fore_color.rgb = BORDER_COLOR
    line.line.color.rgb = BORDER_COLOR

    # Footer
    if slide_num:
        foot_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(11.733), Inches(0.3))
        tf_f = foot_box.text_frame
        tf_f.margin_left = tf_f.margin_right = tf_f.margin_top = tf_f.margin_bottom = 0
        p_f = tf_f.paragraphs[0]
        p_f.text = f"AI Interview Preparation Assistant  •  Syed Hasan Abbas & Srujan Shetty"
        p_f.font.name = "Calibri"
        p_f.font.size = Pt(9.5)
        p_f.font.color.rgb = MUTED

        num_box = slide.shapes.add_textbox(Inches(11.0), Inches(7.05), Inches(1.533), Inches(0.3))
        tf_n = num_box.text_frame
        tf_n.margin_left = tf_n.margin_right = tf_n.margin_top = tf_n.margin_bottom = 0
        p_n = tf_n.paragraphs[0]
        p_n.alignment = PP_ALIGN.RIGHT
        p_n.text = f"{slide_num} / 12"
        p_n.font.name = "Calibri"
        p_n.font.size = Pt(9.5)
        p_n.font.bold = True
        p_n.font.color.rgb = ACCENT_BLUE

def add_card(slide, left, top, width, height, title=None, bg_color=BG_CARD, border_color=BORDER_COLOR):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = border_color
    shape.line.width = Pt(1)
    
    if title:
        title_box = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.18), width - Inches(0.4), Inches(0.35))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = "Calibri"
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = PRIMARY
    return shape

print("Helper functions ready.")
