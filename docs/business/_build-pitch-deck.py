# -*- coding: utf-8 -*-
"""عرض «أمانة» التقديمي — دراسة جدوى / Pitch Deck.

يُبنى بهوية المشروع (أرجواني عميق + ذهبي) وباتجاه من اليمين لليسار.
كل رقم هنا مشتقّ من docs/business/tech-budget-3y.md والنموذج المالي المصحّح.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

OUT = r"D:\amana\amana-platform\docs\business\amana-pitch-deck.pptx"
LOGO = r"D:\amana\amana-platform\apps\admin\public\logo-amana.png"

# ─────────────────────────── الهوية البصرية ───────────────────────────
INK        = RGBColor(0x16, 0x10, 0x1F)
PAPER      = RGBColor(0xFF, 0xFF, 0xFF)
PURPLE     = RGBColor(0x5B, 0x2C, 0x87)
PURPLE_MID = RGBColor(0x7C, 0x3A, 0xED)
PURPLE_PALE= RGBColor(0xF4, 0xEE, 0xFA)
GOLD       = RGBColor(0xA8, 0x79, 0x2F)
GOLD_PALE  = RGBColor(0xF7, 0xEF, 0xDE)
NAVY       = RGBColor(0x25, 0x45, 0x94)
GREY       = RGBColor(0x6E, 0x65, 0x79)
GREY_PALE  = RGBColor(0xF2, 0xF1, 0xF4)
GREEN      = RGBColor(0x2F, 0x7A, 0x55)
RED        = RGBColor(0xB4, 0x45, 0x3C)
WHITE      = RGBColor(0xFF, 0xFF, 0xFF)

FONT = "Arial"
W, H = 13.333, 7.5

prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)
BLANK = prs.slide_layouts[6]


# ────────────────────────────── أدوات ──────────────────────────────
def _rtl(par):
    """يضبط اتجاه الفقرة من اليمين لليسار — PowerPoint لا يرثه تلقائيًّا."""
    par._p.get_or_add_pPr().set('rtl', '1')


def text(slide, s, x, y, w, h, size=16, bold=False, color=INK,
         align=PP_ALIGN.RIGHT, rtl=True, spacing=1.25, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

    for i, line in enumerate(str(s).split('\n')):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        if rtl:
            _rtl(p)
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.name = FONT
        r.font.color.rgb = color
    return box


def rect(slide, x, y, w, h, fill=None, line=None, radius=None):
    shape = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    sh = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if radius:
        sh.adjustments[0] = radius
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = Pt(1)
    sh.shadow.inherit = False
    return sh


def slide_light(title=None, eyebrow=None, sub=None):
    """شريحة فاتحة بترويسة موحّدة."""
    s = prs.slides.add_slide(BLANK)
    rect(s, 0, 0, W, H, fill=PAPER)
    # شريط ذهبي رفيع أعلى اليمين — علامة الهوية
    rect(s, W - 1.55, 0, 1.55, 0.10, fill=GOLD)
    if eyebrow:
        text(s, eyebrow, 0.9, 0.55, W - 1.8, 0.3, size=12, bold=True, color=GOLD)
    if title:
        text(s, title, 0.9, 0.92, W - 1.8, 0.75, size=32, bold=True, color=PURPLE)
    if sub:
        text(s, sub, 0.9, 1.75, W - 1.8, 0.5, size=14, color=GREY)
    return s


def slide_dark(eyebrow=None, title=None, sub=None):
    """شريحة أرجوانية كاملة — للحظات الكبرى فقط."""
    s = prs.slides.add_slide(BLANK)
    rect(s, 0, 0, W, H, fill=PURPLE)
    rect(s, 0, 0, W, 0.12, fill=GOLD)
    if eyebrow:
        text(s, eyebrow, 0.9, 1.5, W - 1.8, 0.3, size=13, bold=True, color=GOLD_PALE)
    if title:
        text(s, title, 0.9, 1.95, W - 1.8, 1.6, size=40, bold=True, color=WHITE)
    if sub:
        text(s, sub, 0.9, 3.6, W - 1.8, 1.0, size=16, color=RGBColor(0xDC, 0xCD, 0xEC))
    return s


def card(slide, x, y, w, h, title, body, accent=PURPLE, icon=None, title_size=15):
    rect(slide, x, y, w, h, fill=PAPER, line=RGBColor(0xE3, 0xDE, 0xEB), radius=0.06)
    rect(slide, x + w - 0.06, y + 0.28, 0.06, h - 0.56, fill=accent)
    top = y + 0.28
    if icon:
        text(slide, icon, x + 0.25, top, w - 0.75, 0.4, size=20, align=PP_ALIGN.RIGHT)
        top += 0.5
    text(slide, title, x + 0.25, top, w - 0.55, 0.4, size=title_size, bold=True, color=INK)
    text(slide, body, x + 0.25, top + 0.42, w - 0.55, h - (top - y) - 0.6,
         size=11.5, color=GREY, spacing=1.3)


def kpi(slide, x, y, w, value, label, color=PURPLE, vsize=34):
    text(slide, value, x, y, w, 0.65, size=vsize, bold=True, color=color, align=PP_ALIGN.CENTER)
    text(slide, label, x, y + 0.68, w, 0.4, size=12, color=GREY, align=PP_ALIGN.CENTER)


def table(slide, x, y, w, headers, rows, col_w=None, row_h=0.42,
          head_fill=PURPLE, foot=None, size=12):
    """جدول مرسوم يدويًّا — أدقّ في التحكّم بالاتجاه والمحاذاة من جدول pptx."""
    n = len(headers)
    col_w = col_w or [w / n] * n
    # الترويسة
    rect(slide, x, y, w, 0.44, fill=head_fill)
    cx = x + w
    for i, hcell in enumerate(headers):
        cx -= col_w[i]
        align = PP_ALIGN.RIGHT if i == 0 else PP_ALIGN.CENTER
        text(slide, hcell, cx + 0.12, y + 0.11, col_w[i] - 0.24, 0.3,
             size=size - 0.5, bold=True, color=WHITE, align=align)

    yy = y + 0.44
    for ri, row in enumerate(rows):
        if ri % 2 == 1:
            rect(slide, x, yy, w, row_h, fill=GREY_PALE)
        cx = x + w
        for i, cell in enumerate(row):
            cx -= col_w[i]
            align = PP_ALIGN.RIGHT if i == 0 else PP_ALIGN.CENTER
            bold = i == 0
            text(slide, cell, cx + 0.12, yy + (row_h - 0.24) / 2, col_w[i] - 0.24, 0.26,
                 size=size, bold=bold, color=INK if i == 0 else GREY, align=align)
        yy += row_h

    if foot:
        rect(slide, x, yy, w, row_h + 0.06, fill=PURPLE_PALE)
        cx = x + w
        for i, cell in enumerate(foot):
            cx -= col_w[i]
            align = PP_ALIGN.RIGHT if i == 0 else PP_ALIGN.CENTER
            text(slide, cell, cx + 0.12, yy + 0.09, col_w[i] - 0.24, 0.3,
                 size=size + 0.5, bold=True, color=PURPLE, align=align)
        yy += row_h + 0.06
    return yy


def bars(slide, x, y, w, h, items, maxv=None, fmt=lambda v: f"{v:,.0f}",
         color=PURPLE, highlight=None, hcolor=GOLD):
    """أعمدة رأسية بسيطة. items = [(label, value)]."""
    maxv = maxv or max(v for _, v in items) or 1
    n = len(items)
    gap = 0.5
    bw = (w - gap * (n - 1)) / n
    cx = x + w
    for i, (label, v) in enumerate(items):
        cx -= bw
        bh = max(0.06, (abs(v) / maxv) * h)
        c = hcolor if (highlight is not None and i == highlight) else color
        rect(slide, cx, y + h - bh, bw, bh, fill=c)
        text(slide, fmt(v), cx, y + h - bh - 0.42, bw, 0.35,
             size=15, bold=True, color=c, align=PP_ALIGN.CENTER)
        text(slide, label, cx, y + h + 0.14, bw, 0.35,
             size=12, color=GREY, align=PP_ALIGN.CENTER)
        cx -= gap


def footer(slide, num):
    text(slide, "أمانة — دراسة جدوى", 0.9, H - 0.55, 3.0, 0.3, size=9.5, color=GREY)
    text(slide, str(num), W - 1.4, H - 0.55, 0.5, 0.3, size=9.5, color=GREY,
         align=PP_ALIGN.LEFT, rtl=False)


# ═══════════════════════════ 1 · الغلاف ═══════════════════════════
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, W, H, fill=PURPLE)
rect(s, 0, 0, W, 0.14, fill=GOLD)
rect(s, 0, H - 2.35, W, 2.35, fill=RGBColor(0x4A, 0x22, 0x70))

if os.path.exists(LOGO):
    s.shapes.add_picture(LOGO, Inches(W - 2.35), Inches(0.75), height=Inches(1.25))

text(s, "منصّة التنقّل النسائي الذكية", 0.9, 2.35, W - 3.6, 0.4, size=15, bold=True, color=GOLD_PALE)
text(s, "أمانة", 0.9, 2.85, W - 3.6, 1.3, size=64, bold=True, color=WHITE)
text(s, "دراسة جدوى متكاملة · مشروع ريادي مبتكر", 0.9, 4.25, W - 3.6, 0.5, size=20,
     color=RGBColor(0xD8, 0xC7, 0xEA))

text(s, "مقدَّمة إلى", 0.9, H - 1.95, 5.0, 0.3, size=11, bold=True, color=GOLD)
text(s, "جامعة القصيم — مركز الابتكار والملكية الفكرية", 0.9, H - 1.6, 6.5, 0.4,
     size=16, bold=True, color=WHITE)
text(s, "م. مدني كمال مدني حميدة   ·   م. عصمت عمر إبراهيم", 0.9, H - 1.1, 6.5, 0.35,
     size=12, color=RGBColor(0xC9, 0xB6, 0xDE))
text(s, "يوليو ٢٠٢٦", W - 3.3, H - 1.6, 2.4, 0.4, size=14, bold=True, color=GOLD_PALE,
     align=PP_ALIGN.LEFT)

# ═══════════════════════ 2 · الفرصة والمشكلة ═══════════════════════
s = slide_light("الفرصة", "سوق قائم بلا حلّ مخصَّص",
                "المرأة في المملكة تتنقّل يوميًّا عبر تطبيقات لم تُصمَّم لها، فتدفع ثمن ذلك راحةً وأمانًا وخصوصية.")
card(s, 8.9, 2.5, 3.55, 2.05, "الخصوصية", "غالبية السائقين رجال، والرحلة اليومية تتحوّل إلى مصدر توتّر متكرّر لا خيار فيه.", PURPLE, "🔒")
card(s, 5.05, 2.5, 3.55, 2.05, "الأمان", "لا أدوات سلامة مصمَّمة للمرأة: لا مرافقة أطفال، ولا مجموعات مغلقة، ولا تحقّق مزدوج.", PURPLE, "🛡️")
card(s, 1.2, 2.5, 3.55, 2.05, "التمكين", "آلاف السعوديات يبحثن عن دخل مرن؛ قيادة المرأة فتحت الباب ولم يفتح أحد السوق.", PURPLE, "👩")
rect(s, 1.2, 4.95, 11.25, 1.05, fill=GOLD_PALE, radius=0.08)
text(s, "الفجوة: لا يوجد في السوق السعودي تطبيق نقل نسائي بالكامل — من الراكبة إلى السائقة إلى فريق الدعم.",
     1.5, 5.28, 10.65, 0.45, size=15, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
footer(s, 2)

# ═══════════════════════════ 3 · الحلّ ═══════════════════════════
s = slide_dark("الحلّ", "منظومة تنقّل نسائية\nمدعومة بالذكاء الاصطناعي",
               "ليست تطبيق نقل فحسب — بل بيئة كاملة صُمّمت حول أمان المرأة وخصوصيتها وتمكينها اقتصاديًّا.")
for i, (v, l) in enumerate([("٣", "تطبيقات متكاملة"), ("١٠٠٪", "نسائية بالكامل"),
                            ("AI", "ذكاء اصطناعي مدمج"), ("جاهز", "نموذج أوّلي يعمل")]):
    x = W - 1.0 - (i + 1) * 2.85 + 0.15
    text(s, v, x, 5.05, 2.6, 0.6, size=30, bold=True, color=GOLD_PALE, align=PP_ALIGN.CENTER)
    text(s, l, x, 5.72, 2.6, 0.35, size=12.5, color=RGBColor(0xD2, 0xC0, 0xE6), align=PP_ALIGN.CENTER)
footer(s, 3)

# ══════════════════ 4 · مصفوفة التفرّد ══════════════════
s = slide_light("الميزة التنافسية", "ستّ مزايا لا يملكها أيّ منافس مجتمعة",
                "كل ميزة تحلّ مشكلة حقيقية، وثلاث منها غير موجودة في السوق السعودي إطلاقًا.")
feats = [
    ("🧠", "مساعد السفر الذكي", "يقترح وجهات بناءً على اهتمامات الراكبة وتاريخ رحلاتها."),
    ("📈", "التسعير الديناميكي", "سعر شفّاف يعكس الطلب لحظيًّا، ويُعرض قبل التأكيد."),
    ("🌿", "البصمة الكربونية", "حساب التوفير في الانبعاثات ومكافآت خضراء للراكبات."),
    ("👩‍👧", "مرافقة الأطفال", "سائقات مدرَّبات على تركيب مقاعد الأطفال — لا يقدّمها منافس."),
    ("🔒", "المجموعات المغلقة", "رحلات تشاركية خاصّة بين زميلات العمل أو الدراسة."),
    ("🛡️", "التقييم المزدوج", "تقييم الراكبة والسائقة معًا — حماية متبادلة ترفع الجودة."),
]
for i, (ic, t, b) in enumerate(feats):
    col, row = i % 3, i // 3
    x = W - 1.2 - (col + 1) * 3.75 + 0.2
    y = 2.45 + row * 2.05
    card(s, x, y, 3.55, 1.85, t, b, PURPLE if row == 0 else GOLD, ic, title_size=14)
footer(s, 4)

# ═══════════════════ 5 · فرضيات النموّ ═══════════════════
s = slide_light("أساس الحساب", "فرضيات النموّ",
                "كل رقم في هذا العرض مشتقّ من هذه الفرضيات — تغييرها يغيّر النتائج بالتناسب.")
table(s, 1.2, 2.55, 11.25,
      ["المؤشّر", "السنة ١ — الإطلاق", "السنة ٢ — النموّ", "السنة ٣ — التوسّع"],
      [["المدن المغطّاة", "١ (بريدة)", "٣", "٥ – ٧"],
       ["مستخدمات نشطات شهريًّا", "٥٬٠٠٠", "٣٥٬٠٠٠", "١٢٠٬٠٠٠"],
       ["سائقات نشطات", "١٥٠", "١٬٢٠٠", "٤٬٠٠٠"],
       ["الرحلات سنويًّا", "٣٠٬٠٠٠", "٣٠٠٬٠٠٠", "١٬٠٠٠٬٠٠٠"],
       ["متوسّط قيمة الرحلة", "٤٥ ريال", "٤٥ ريال", "٤٥ ريال"]],
      col_w=[3.75, 2.5, 2.5, 2.5], row_h=0.52, size=13)
rect(s, 1.2, 5.6, 11.25, 0.85, fill=PURPLE_PALE, radius=0.1)
text(s, "الإطلاق من بريدة بدعم حاضنة جامعة القصيم، ثمّ التوسّع إلى الرياض وجدة والدمام في السنة الثانية.",
     1.5, 5.88, 10.65, 0.4, size=13, color=PURPLE, align=PP_ALIGN.CENTER)
footer(s, 5)

# ══════════════ 6 · الأطروحة: تكلفة الرحلة ══════════════
s = slide_light("الأطروحة الاستثمارية", "التكلفة التقنية لكل رحلة تنخفض ٩٥٪",
                "فريق ثابت من ٨ أفراد وبنية سحابية مُدارة يخدمان ٣٠ ألف رحلة أو مليون رحلة بالهيكل نفسه.")
bars(s, 2.6, 2.75, 8.4, 2.45,
     [("السنة ١\n٣٠ ألف رحلة", 42.6), ("السنة ٢\n٣٠٠ ألف رحلة", 5.2), ("السنة ٣\nمليون رحلة", 2.1)],
     maxv=42.6, fmt=lambda v: f"{v} ر.س", highlight=2)
rect(s, 4.35, 6.05, 4.6, 0.62, fill=GOLD_PALE, radius=0.2)
text(s, "▼  انخفاض ٩٥٪ في تكلفة الرحلة الواحدة", 4.35, 6.24, 4.6, 0.35,
     size=14, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
footer(s, 6)

# ══════════════════ 7 · الميزانية التقنية ══════════════════
s = slide_light("الاستثمار التقني", "الميزانية التقنية — ثلاث سنوات",
                "خدمات سحابية مُدارة بالكامل: لا خوادم مملوكة ولا مراكز بيانات ولا فريق تشغيل.")
table(s, 1.2, 2.5, 11.25,
      ["البند", "السنة ١", "السنة ٢", "السنة ٣", "الإجمالي"],
      [["البنية التحتية", "٢٠٬١٥٠", "٩٣٬٥٠٠", "٢٧٣٬٠٠٠", "٣٨٦٬٦٥٠"],
       ["الذكاء الاصطناعي", "٢٬٢٥٠", "١١٦٬٠٠٠", "٢٤٧٬٠٠٠", "٣٦٥٬٢٥٠"],
       ["الفريق التقني", "١٬٠٢٠٬٠٠٠", "١٬٠٩٥٬٠٠٠", "١٬١٧٠٬٠٠٠", "٣٬٢٨٥٬٠٠٠"],
       ["الأمن والأدوات", "١٢٠٬٠٠٠", "١١٥٬٠٠٠", "١٧٥٬٠٠٠", "٤١٠٬٠٠٠"],
       ["احتياطي طوارئ ١٠٪", "١١٦٬٢٤٠", "١٤١٬٩٥٠", "١٨٦٬٥٠٠", "٤٤٤٬٦٩٠"]],
      col_w=[3.05, 2.05, 2.05, 2.05, 2.05], row_h=0.5, size=12.5,
      foot=["الإجمالي", "١٬٢٧٨٬٦٤٠", "١٬٥٦١٬٤٥٠", "٢٬٠٥١٬٥٠٠", "٤٬٨٩١٬٥٩٠"])
rect(s, 1.2, 6.0, 11.25, 0.75, fill=GOLD_PALE, radius=0.1)
text(s, "مخاطرة مركَّزة: Mapbox يمثّل نصف فاتورة البنية بالسنة ٣ — التخزين المؤقّت للمسارات وعقد بالحجم يوفّران ٣٠–٤٠٪.",
     1.5, 6.22, 10.65, 0.4, size=12.5, color=GOLD, align=PP_ALIGN.CENTER)
footer(s, 7)

# ═══════════════════ 8 · الفريق التقني ═══════════════════
s = slide_light("الهيكل", "فريق تقني ثابت — ٨ أفراد",
                "دور واحد لكل تخصّص جوهري، بلا توسّع في الهيكل عبر السنوات الثلاث.")
table(s, 1.2, 2.55, 11.25,
      ["الدور", "الراتب/شهر", "العدد", "السنة ١", "السنة ٢", "السنة ٣"],
      [["قائد تقني (CTO)", "١٨٬٠٠٠", "١", "٢٥٩٬٢٠٠", "٢٧٧٬٣٠٠", "٢٩٦٬٤٠٠"],
       ["مطوّر Full-stack", "١٣٬٠٠٠", "١", "١٨٧٬٢٠٠", "٢٠٠٬٤٠٠", "٢١٤٬٢٠٠"],
       ["مطوّر مساعد", "٨٬٠٠٠", "٢", "٢٣٠٬٤٠٠", "٢٤٦٬٦٠٠", "٢٦٣٬٥٠٠"],
       ["دعم فنّي", "٦٬٠٠٠", "٤", "٣٤٥٬٦٠٠", "٣٧٠٬٧٠٠", "٣٩٥٬٩٠٠"]],
      col_w=[3.15, 1.7, 1.2, 1.73, 1.73, 1.74], row_h=0.52, size=12.5,
      foot=["الإجمالي", "٧١٬٠٠٠", "٨", "١٬٠٢٠٬٠٠٠", "١٬٠٩٥٬٠٠٠", "١٬١٧٠٬٠٠٠"])
rect(s, 1.2, 5.75, 11.25, 0.95, fill=PURPLE_PALE, radius=0.1)
text(s, "لماذا يكفي هذا الحجم: البنية سحابية مُدارة فلا حاجة لفريق تشغيل خوادم،\nوالدعم الذكي المدمج يمتصّ الاستفسارات المتكرّرة فيتفرّغ الدعم للحالات الحقيقية.",
     1.5, 5.95, 10.65, 0.6, size=12.5, color=PURPLE, align=PP_ALIGN.CENTER)
footer(s, 8)

# ══════════════════ 9 · التوقّعات المالية ══════════════════
s = slide_light("النموذج المالي", "من الاستثمار إلى الربحية في ٣ سنوات",
                "الإيراد = عمولة ٢٠٪ من قيمة الرحلات + اشتراكات وإعلانات. الأرقام بملايين الريالات.")
table(s, 1.2, 2.45, 11.25,
      ["المؤشّر", "السنة ١", "السنة ٢", "السنة ٣"],
      [["الرحلات سنويًّا", "٣٠٬٠٠٠", "٣٠٠٬٠٠٠", "١٬٠٠٠٬٠٠٠"],
       ["إجمالي قيمة الرحلات (GMV)", "١٫٣٥", "١٣٫٥٠", "٤٥٫٠٠"],
       ["الإيرادات", "٠٫٣٢", "٢٫٨٠", "٩٫٢٠"],
       ["التكاليف الكلّية", "١٫٨٠", "٢٫٦١", "٤٫٢٠"]],
      col_w=[4.35, 2.3, 2.3, 2.3], row_h=0.5, size=13,
      foot=["صافي الربح / (الخسارة)", "(١٫٤٨)", "٠٫١٩", "٥٫٠٠"])
for i, (v, l, c) in enumerate([("السنة ٣", "الربحية الكاملة · ٥ مليون", GREEN),
                               ("السنة ٢", "نقطة التعادل", GOLD),
                               ("السنة ١", "استثمار وبناء السوق", PURPLE)]):
    x = 1.2 + i * 3.79
    rect(s, x, 5.35, 3.65, 1.05, fill=PAPER, line=RGBColor(0xE3, 0xDE, 0xEB), radius=0.08)
    rect(s, x, 5.35, 3.65, 0.07, fill=c)
    text(s, v, x, 5.58, 3.65, 0.32, size=15, bold=True, color=c, align=PP_ALIGN.CENTER)
    text(s, l, x, 5.94, 3.65, 0.3, size=11.5, color=GREY, align=PP_ALIGN.CENTER)
text(s, "الخسارة في السنة الأولى مقصودة ومموَّلة — هي كلفة بناء شبكة السائقات وقاعدة المستخدمات.",
     1.2, 6.6, 11.25, 0.35, size=12, color=GREY, align=PP_ALIGN.CENTER)
footer(s, 9)

# ═══════════ 10 · اقتصاديات الرحلة الواحدة ═══════════
s = slide_dark("اقتصاديات الوحدة", "كل رحلة تربح ٥ ريالات\nفي السنة الثالثة")
for i, (v, l, c) in enumerate([("٩٫٢٠", "إيراد المنصّة", GOLD_PALE),
                               ("٤٫٢٠", "التكلفة الكلّية", RGBColor(0xC9, 0xB6, 0xDE)),
                               ("٥٫٠٠", "هامش المساهمة", WHITE)]):
    x = W - 1.0 - (i + 1) * 3.75 + 0.15
    text(s, v, x, 4.35, 3.5, 0.8, size=44, bold=True, color=c, align=PP_ALIGN.CENTER)
    text(s, l + " · ريال", x, 5.25, 3.5, 0.35, size=13, color=RGBColor(0xD2, 0xC0, 0xE6),
         align=PP_ALIGN.CENTER)
text(s, "هامش تشغيلي ٥٤٪ — ونحن ما زلنا نحتسب كامل تكلفة الفريق والبنية داخل الرقم.",
     0.9, 6.15, W - 1.8, 0.4, size=13, color=GOLD_PALE, align=PP_ALIGN.CENTER)
footer(s, 10)

# ═══════════════════ 11 · خارطة الطريق ═══════════════════
s = slide_light("التنفيذ", "خارطة الطريق — أوّل ١٢ شهرًا",
                "رأس مال تأسيسي ٨٠٠ ألف ريال موزّع على ستّ مراحل تنفيذية واضحة.")
phases = [
    ("١–٢", "التأسيس والترخيص", "خطاب تأييد الجامعة، الترخيص الريادي، السجل التجاري", "٥٠٬٠٠٠"),
    ("٢–٤", "التطوير التقني (MVP)", "بناء التطبيقات، تكامل الخرائط والدفع، البنية السحابية", "١٥٠٬٠٠٠"),
    ("٣", "التوظيف والتدريب", "استقطاب أوّل ١٠٠ سائقة وتأهيلهنّ", "١٠٠٬٠٠٠"),
    ("٥", "الإطلاق التجريبي", "التشغيل في بريدة وجمع الملاحظات الميدانية", "٥٠٬٠٠٠"),
    ("٦", "الإطلاق الرسمي", "حملة تسويقية واستقطاب ٥ آلاف مستخدمة", "٢٠٠٬٠٠٠"),
    ("١٢", "التوسّع الإقليمي", "الرياض وجدة والدمام", "٢٥٠٬٠٠٠"),
]
yy = 2.5
for i, (m, t, d, c) in enumerate(phases):
    if i % 2 == 1:
        rect(s, 1.2, yy, 11.25, 0.62, fill=GREY_PALE)
    rect(s, 11.65, yy + 0.11, 0.72, 0.4, fill=PURPLE_PALE, radius=0.2)
    text(s, m, 11.65, yy + 0.2, 0.72, 0.25, size=11.5, bold=True, color=PURPLE, align=PP_ALIGN.CENTER)
    text(s, t, 8.6, yy + 0.09, 2.9, 0.28, size=13.5, bold=True, color=INK)
    text(s, d, 3.2, yy + 0.13, 5.25, 0.3, size=11.5, color=GREY)
    text(s, c + " ريال", 1.3, yy + 0.12, 1.75, 0.3, size=12.5, bold=True, color=GOLD, align=PP_ALIGN.LEFT)
    yy += 0.62
rect(s, 1.2, yy + 0.12, 11.25, 0.6, fill=PURPLE)
text(s, "إجمالي رأس المال التأسيسي", 8.6, yy + 0.29, 3.6, 0.3, size=14, bold=True, color=WHITE)
text(s, "٨٠٠٬٠٠٠ ريال", 1.3, yy + 0.29, 3.0, 0.3, size=15, bold=True, color=GOLD_PALE, align=PP_ALIGN.LEFT)
footer(s, 11)

# ════════════════ 12 · طلب التمويل ════════════════
s = slide_light("الطلب", "٢٫٥ مليون ريال — تمويل حتى الربحية",
                "يغطّي رأس المال التأسيسي وعجز التشغيل حتى نقطة التعادل في السنة الثانية، مع هامش أمان.")
uses = [("التطوير التقني والبنية", "١٬٢٨٠٬٠٠٠", "٥١٪"),
        ("التسويق واكتساب المستخدمات", "٦٥٠٬٠٠٠", "٢٦٪"),
        ("استقطاب السائقات وتأهيلهنّ", "٣٢٠٬٠٠٠", "١٣٪"),
        ("التراخيص والامتثال القانوني", "١٢٥٬٠٠٠", "٥٪"),
        ("احتياطي تشغيلي", "١٢٥٬٠٠٠", "٥٪")]
table(s, 1.2, 2.6, 7.4, ["أوجه الاستخدام", "المبلغ", "النسبة"],
      [list(u) for u in uses], col_w=[4.0, 2.0, 1.4], row_h=0.55, size=13,
      foot=["الإجمالي", "٢٬٥٠٠٬٠٠٠", "١٠٠٪"])
card(s, 8.85, 2.6, 3.6, 1.75, "مصادر الدعم المستهدفة",
     "منشآت · كفالة (حتى ١٥ مليون ضمان) · ريادة (حتى ٣٠٠ ألف نقدًا) · رواد التقنية · حاضنة جامعة القصيم", GOLD, "🤝")
card(s, 8.85, 4.55, 3.6, 1.75, "العائد المتوقّع",
     "استرداد كامل خلال السنة الثالثة، وصافي ربح تراكمي ٣٫٧ مليون ريال بنهاية السنة الثالثة.", GREEN, "📈")
footer(s, 12)

# ═════════════ 13 · التوافق مع رؤية ٢٠٣٠ ═════════════
s = slide_light("التوافق الوطني", "أمانة ورؤية ٢٠٣٠",
                "المشروع يخدم أربعة مستهدفات وطنية في آنٍ واحد — وهذا ما يجعله مؤهّلًا للدعم.")
v30 = [("👩‍💼", "تمكين المرأة", "٤٬٠٠٠+ فرصة عمل مرنة للسعوديات بحلول السنة الثالثة."),
       ("💡", "الابتكار التقني", "ذكاء اصطناعي وتسعير ديناميكي مبنيّ محلّيًّا بكوادر وطنية."),
       ("🌿", "الاستدامة", "نقل تشاركي يخفض الانبعاثات ويقيسها ويكافئ عليها."),
       ("✨", "جودة الحياة", "تنقّل آمن ومريح يرفع مشاركة المرأة في سوق العمل والتعليم.")]
for i, (ic, t, b) in enumerate(v30):
    col, row = i % 2, i // 2
    x = W - 1.2 - (col + 1) * 5.65 + 0.25
    y = 2.55 + row * 2.05
    card(s, x, y, 5.4, 1.85, t, b, PURPLE if row == 0 else GOLD, ic, title_size=15)
footer(s, 13)

# ══════════════════ 14 · إدارة المخاطر ══════════════════
s = slide_light("الحوكمة", "إدارة المخاطر",
                "لكل مخاطرة استراتيجية تخفيف قابلة للقياس ومُدرجة في الميزانية.")
table(s, 1.2, 2.55, 11.25, ["المخاطرة", "استراتيجية التخفيف"],
      [["تقنية — تعطّل أو اختراق",
        "بنية سحابية مُدارة (Supabase / Vercel)، نسخ احتياطي يومي، اختبار اختراق سنوي مموَّل"],
       ["تشغيلية — نقص السائقات",
        "حوافز ذروة، تسعير ديناميكي، استقطاب مستمرّ بالشراكة مع الجامعات"],
       ["تنافسية — دخول لاعب كبير",
        "مزايا حصرية يصعب تقليدها، ومجتمع نسائي مغلق يبني ولاءً حقيقيًّا"],
       ["تنظيمية — متطلّبات الترخيص",
        "تواصل مبكر مع هيئة النقل، واستشارة قانونية مدرجة في الميزانية"],
       ["مالية — تجاوز التكاليف",
        "احتياطي طوارئ ١٠٪، وأكبر بند متغيّر (الخرائط) له خطّة خفض ٣٠–٤٠٪"]],
      col_w=[3.6, 7.65], row_h=0.62, size=12.5)
footer(s, 14)

# ═════════════════ 15 · لماذا الآن ═════════════════
s = slide_dark("الخلاصة", "لماذا أمانة، ولماذا الآن؟")
whys = [("السوق مفتوح", "لا منافس نسائي متكامل في المملكة حتى اليوم"),
        ("المنتج جاهز", "نموذج أوّلي يعمل فعليًّا — ليس فكرة على ورق"),
        ("الاقتصاد سليم", "هامش ٥٤٪ للرحلة وربحية كاملة في السنة الثالثة"),
        ("التوقيت مثالي", "رؤية ٢٠٣٠ وبرامج الدعم في ذروة تفعيلها")]
for i, (t, b) in enumerate(whys):
    col, row = i % 2, i // 2
    x = W - 1.0 - (col + 1) * 5.7 + 0.2
    y = 3.5 + row * 1.4
    text(s, "◆  " + t, x, y, 5.3, 0.4, size=19, bold=True, color=GOLD_PALE)
    text(s, b, x + 0.35, y + 0.45, 4.95, 0.4, size=13, color=RGBColor(0xD2, 0xC0, 0xE6))
footer(s, 15)

# ═══════════════════ 16 · التواصل ═══════════════════
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, W, H, fill=PAPER)
rect(s, 0, 0, W, 0.14, fill=GOLD)
if os.path.exists(LOGO):
    s.shapes.add_picture(LOGO, Inches(W / 2 - 0.7), Inches(1.15), height=Inches(1.4))
text(s, "أمانة", 0, 2.75, W, 0.9, size=46, bold=True, color=PURPLE, align=PP_ALIGN.CENTER)
text(s, "رحلتكِ… بأمان وراحة تامّة", 0, 3.7, W, 0.5, size=19, color=GREY, align=PP_ALIGN.CENTER)
rect(s, 3.4, 4.6, 6.5, 0.04, fill=GOLD)

text(s, "م. مدني كمال مدني حميدة", 6.95, 5.0, 5.0, 0.35, size=15, bold=True, color=INK)
text(s, "٠٠٩٦٦٥٧٩٥٩٧٩٠٦", 6.95, 5.42, 5.0, 0.32, size=13, color=GREY)
text(s, "medani7@gmail.com", 6.95, 5.8, 5.0, 0.35, size=13.5, bold=True, color=PURPLE,
     align=PP_ALIGN.RIGHT, rtl=False)

text(s, "م. عصمت عمر إبراهيم", 1.4, 5.0, 5.0, 0.35, size=15, bold=True, color=INK)
text(s, "٠٠٩٦٦٥٣٣٣٦٢٨٣٧", 1.4, 5.42, 5.0, 0.32, size=13, color=GREY)
text(s, "esmat369@hotmail.com", 1.4, 5.8, 5.0, 0.35, size=13.5, bold=True, color=PURPLE,
     align=PP_ALIGN.RIGHT, rtl=False)

prs.save(OUT)
print("saved:", OUT, len(prs.slides.__iter__.__self__._sldIdLst), "slides")
