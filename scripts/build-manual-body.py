"""
build-manual-body.py
====================
Genera el cuerpo (páginas 2+) del Manual de Configuración ChatFlow en PDF.

Pipeline:
  1. Crea el PDF del cuerpo con ReportLab (TocDocTemplate + multiBuild)
  2. El PDF del cover se genera aparte con html2poster.js (ver build-cover-html.js)
  3. El script final merge-cover-body.py combina ambos en download/Manual-Configuracion-ChatFlow.pdf

Estructura del cuerpo:
  - Tabla de contenidos
  - Capítulo 1: Visión general
  - Capítulo 2: Pruebas E2E con Playwright
  - Capítulo 3: Documentación API con OpenAPI / Swagger
  - Capítulo 4: Integración Stripe real
  - Capítulo 5: Verificación y operación
  - Apéndice A: Variables de entorno
  - Apéndice B: Solución de problemas
"""
import os
import sys
import hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, Image, ListFlowable, ListItem, Preformatted, Flowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame
from reportlab.pdfgen import canvas as canvas_module

OUT_PATH = '/home/z/my-project/workspace/scripts/manual-body.pdf'

# ─── Fonts (Latin-only, Spanish content) ──────────────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')

pdfmetrics.registerFont(TTFont('FreeSans', f'{FONT_DIR}/truetype/freefont/FreeSans.ttf'))
pdfmetrics.registerFont(TTFont('FreeSans-Bold', f'{FONT_DIR}/truetype/freefont/FreeSansBold.ttf'))
registerFontFamily('FreeSans', normal='FreeSans', bold='FreeSans-Bold')

pdfmetrics.registerFont(TTFont('FreeMono', f'{FONT_DIR}/truetype/freefont/FreeMono.ttf'))
pdfmetrics.registerFont(TTFont('FreeMono-Bold', f'{FONT_DIR}/truetype/freefont/FreeMonoBold.ttf'))
registerFontFamily('FreeMono', normal='FreeMono', bold='FreeMono-Bold')

# ─── Cascade Palette (auto-generated) ─────────────────────────────────────
PAGE_BG       = colors.HexColor('#f6f6f5')
SECTION_BG    = colors.HexColor('#f2f2f0')
CARD_BG       = colors.HexColor('#efeeea')
TABLE_STRIPE  = colors.HexColor('#f3f3f1')
HEADER_FILL   = colors.HexColor('#554e3b')
COVER_BLOCK   = colors.HexColor('#776f58')
BORDER        = colors.HexColor('#dad5c7')
ICON          = colors.HexColor('#94834e')
ACCENT        = colors.HexColor('#887129')
ACCENT_2      = colors.HexColor('#42a7c9')
TEXT_PRIMARY  = colors.HexColor('#252421')
TEXT_MUTED    = colors.HexColor('#828078')
SEM_SUCCESS   = colors.HexColor('#42995f')
SEM_WARNING   = colors.HexColor('#917a4b')
SEM_ERROR     = colors.HexColor('#9b4740')
SEM_INFO      = colors.HexColor('#587694')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ─── Styles ───────────────────────────────────────────────────────────────
BODY_FONT = 'FreeSerif'
BODY_BOLD = 'FreeSerif-Bold'
BODY_ITALIC = 'FreeSerif-Italic'
SANS_FONT = 'FreeSans'
SANS_BOLD = 'FreeSans-Bold'
MONO_FONT = 'FreeMono'
MONO_BOLD = 'FreeMono-Bold'

style_h1 = ParagraphStyle(
    'H1', fontName=SANS_BOLD, fontSize=22, leading=28,
    textColor=HEADER_FILL, spaceBefore=18, spaceAfter=10,
    alignment=TA_LEFT,
)
style_h2 = ParagraphStyle(
    'H2', fontName=SANS_BOLD, fontSize=15, leading=20,
    textColor=HEADER_FILL, spaceBefore=14, spaceAfter=6,
    alignment=TA_LEFT,
)
style_h3 = ParagraphStyle(
    'H3', fontName=SANS_BOLD, fontSize=12, leading=16,
    textColor=ACCENT, spaceBefore=10, spaceAfter=4,
    alignment=TA_LEFT,
)
style_body = ParagraphStyle(
    'Body', fontName=BODY_FONT, fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY,
    spaceBefore=2, spaceAfter=6,
)
style_body_left = ParagraphStyle(
    'BodyLeft', parent=style_body, alignment=TA_LEFT,
)
style_muted = ParagraphStyle(
    'Muted', fontName=BODY_ITALIC, fontSize=9.5, leading=13,
    textColor=TEXT_MUTED, alignment=TA_LEFT,
    spaceBefore=2, spaceAfter=8,
)
style_bullet = ParagraphStyle(
    'Bullet', parent=style_body_left, leftIndent=18, bulletIndent=4,
    spaceBefore=1, spaceAfter=3,
)
style_code = ParagraphStyle(
    'Code', fontName=MONO_FONT, fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, backColor=CARD_BG,
    borderColor=BORDER, borderWidth=0.5, borderPadding=6,
    leftIndent=4, rightIndent=4, spaceBefore=4, spaceAfter=8,
    alignment=TA_LEFT,
)
style_callout = ParagraphStyle(
    'Callout', fontName=BODY_FONT, fontSize=10, leading=15,
    textColor=TEXT_PRIMARY, backColor=colors.HexColor('#fdf6e3'),
    borderColor=ACCENT, borderWidth=0, borderPadding=10,
    leftIndent=8, rightIndent=8, spaceBefore=6, spaceAfter=10,
    alignment=TA_LEFT,
)
style_callout_warn = ParagraphStyle(
    'CalloutWarn', parent=style_callout,
    backColor=colors.HexColor('#fdf0e6'),
    borderColor=SEM_WARNING,
)
style_table_header = ParagraphStyle(
    'TH', fontName=SANS_BOLD, fontSize=9.5, leading=12,
    textColor=colors.white, alignment=TA_LEFT,
)
style_table_cell = ParagraphStyle(
    'TD', fontName=BODY_FONT, fontSize=9.5, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
style_table_cell_mono = ParagraphStyle(
    'TDMono', fontName=MONO_FONT, fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
style_toc_l0 = ParagraphStyle(
    'TOC0', fontName=SANS_BOLD, fontSize=11, leading=18,
    textColor=HEADER_FILL, leftIndent=0,
)
style_toc_l1 = ParagraphStyle(
    'TOC1', fontName=BODY_FONT, fontSize=10, leading=15,
    textColor=TEXT_PRIMARY, leftIndent=18,
)


# ─── Custom flowables ─────────────────────────────────────────────────────
class HRule(Flowable):
    """Horizontal rule across the content width."""
    def __init__(self, width=None, thickness=0.5, color=BORDER, space_before=2, space_after=6):
        super().__init__()
        self.width = width
        self.thickness = thickness
        self.color = color
        self.space_before = space_before
        self.space_after = space_after

    def wrap(self, availWidth, availHeight):
        self.w = self.width or availWidth
        return (self.w, self.thickness + self.space_before + self.space_after)

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        y = self.space_after + self.thickness / 2
        self.canv.line(0, y, self.w, y)


def add_heading(text, style, level=0):
    """Heading flowable with bookmark for TOC."""
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:10]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


def code_block(text):
    """Render a code block with proper escaping."""
    # ReportLab Paragraph needs XML escaping for <, >, &
    escaped = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    # Preserve line breaks
    escaped = escaped.replace('\n', '<br/>')
    return Paragraph(f'<font name="{MONO_FONT}" size="8.5">{escaped}</font>', style_code)


def callout(text, kind='info'):
    """Callout box. kind: info | warn | success"""
    if kind == 'warn':
        style = style_callout_warn
        prefix = '<b>Atención:</b> '
    elif kind == 'success':
        style = ParagraphStyle('CalloutSuccess', parent=style_callout,
                                backColor=colors.HexColor('#eaf6ec'),
                                borderColor=SEM_SUCCESS)
        prefix = '<b>Correcto:</b> '
    else:
        style = style_callout
        prefix = '<b>Nota:</b> '
    return Paragraph(prefix + text, style)


def bullet_list(items, style=style_bullet):
    """Bullet list with custom style."""
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=14, value='\u2022') for item in items],
        bulletType='bullet', bulletColor=ACCENT, bulletFontSize=8,
        leftIndent=14, spaceBefore=2, spaceAfter=6,
    )


def make_table(rows, col_widths=None, header=True):
    """Build a styled table. rows[0] is the header row if header=True."""
    if header:
        header_row = [Paragraph(c, style_table_header) for c in rows[0]]
        data_rows = []
        for r in rows[1:]:
            data_rows.append([Paragraph(c, style_table_cell) for c in r])
        data = [header_row] + data_rows
    else:
        data = [[Paragraph(c, style_table_cell) for c in r] for r in rows]

    avail_width = A4[0] - 50*mm  # ~A4 minus margins
    if col_widths is None:
        n = len(rows[0])
        col_widths = [avail_width / n] * n
    else:
        # Normalize fractions
        total = sum(col_widths)
        col_widths = [w / total * avail_width for w in col_widths]

    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style_cmds = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.25, BORDER),
    ]
    if header:
        style_cmds += [
            ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), SANS_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 9.5),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
            ('TOPPADDING', (0, 0), (-1, 0), 7),
        ]
        # Striped rows
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD))
    t.setStyle(TableStyle(style_cmds))
    return t


# ─── Page template (header/footer) ────────────────────────────────────────
def page_decoration(canvas, doc):
    """Draw header line and footer with page number."""
    canvas.saveState()
    w, h = A4
    # Header
    canvas.setFont(SANS_FONT, 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(25*mm, h - 12*mm, 'MANUAL DE CONFIGURACIÓN · CHATFLOW')
    canvas.drawRightString(w - 25*mm, h - 12*mm, 'v1.0 · ES')
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(25*mm, h - 14*mm, w - 25*mm, h - 14*mm)

    # Footer
    canvas.line(25*mm, 14*mm, w - 25*mm, 14*mm)
    canvas.setFont(SANS_FONT, 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(25*mm, 9*mm, 'ChatFlow Platform')
    canvas.drawCentredString(w / 2, 9*mm, f'Página {doc.page}')
    canvas.drawRightString(w - 25*mm, 9*mm, 'DOC-MAN-001')
    canvas.restoreState()


# ─── TocDocTemplate ───────────────────────────────────────────────────────
class TocDocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, **kw)
        frame = Frame(25*mm, 18*mm, A4[0] - 50*mm, A4[1] - 36*mm,
                      leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0,
                      id='normal')
        self.addPageTemplates([
            PageTemplate(id='main', frames=frame, onPage=page_decoration)
        ])

    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


# ─── Story (content) ──────────────────────────────────────────────────────
def build_story():
    story = []

    # ─── TOC page ──────────────────────────────────────────────────────────
    story.append(Paragraph('Tabla de contenidos', style_h1))
    story.append(HRule(thickness=1, color=HEADER_FILL, space_after=10))
    story.append(Paragraph(
        'Este manual describe paso a paso cómo configurar las tres piezas clave de '
        'la plataforma ChatFlow: pruebas E2E, documentación API y facturación real '
        'con Stripe. Cada capítulo es autónomo: puedes implementarlos en paralelo o '
        'en el orden que prefieras.', style_muted))
    story.append(Spacer(1, 6))
    toc = TableOfContents()
    toc.levelStyles = [style_toc_l0, style_toc_l1]
    story.append(toc)
    story.append(PageBreak())

    # ─── Capítulo 1: Visión general ────────────────────────────────────────
    story.append(add_heading('Capítulo 1 · Visión general', style_h1, level=0))
    story.append(HRule(thickness=1, color=HEADER_FILL, space_after=8))

    story.append(Paragraph(
        'ChatFlow es una plataforma SaaS multi-canal para construir chatbots con '
        'constructor visual de flujos. Antes de llevarla a producción en cualquier '
        'negocio, hay tres piezas no negociables que toda plataforma SaaS moderna '
        'debe tener: <b>pruebas automatizadas</b> que validen que los flujos críticos '
        'siguen funcionando tras cada cambio, <b>documentación API auto-actualizable</b> '
        'que los integradores puedan consumir sin pedirte ayuda, y <b>facturación '
        'real</b> que cobre a tus clientes de forma confiable y cumpla con las '
        'normativas fiscales del país donde operas.', style_body))

    story.append(Paragraph(
        'Este manual detalla cómo configurar esas tres piezas en un proyecto nuevo '
        'o existente basado en Next.js 16 + Prisma + PostgreSQL. Cada capítulo '
        'incluye: archivos a crear, comandos a ejecutar, variables de entorno '
        'necesarias, y una lista de verificación final. La configuración de SUNAT '
        '(facturación electrónica de Perú) se deja pendiente para un documento '
        'posterior: Stripe funciona perfectamente sin SUNAT y emite facturas '
        'propias que la mayoría de negocios puede usar directamente.', style_body))

    story.append(add_heading('1.1 · Arquitectura de las tres piezas', style_h2, level=1))
    story.append(Paragraph(
        'Las tres piezas son ortogonales pero comparten el mismo patrón: usan '
        'librerías estándar de la industria, se configuran vía variables de entorno, '
        'y exponen endpoints HTTP que se pueden probar de forma aislada. La tabla '
        'siguiente resume el rol de cada una y los componentes principales.', style_body))

    story.append(make_table([
        ['Pieza', 'Rol', 'Stack', 'Carpeta principal'],
        ['E2E', 'Validar flujos críticos tras cada deploy',
         'Playwright + Chromium', 'tests/e2e/'],
        ['OpenAPI', 'Documentación API auto-actualizable',
         'openapi-types + Scalar UI', 'src/lib/openapi-spec.ts + /docs'],
        ['Stripe', 'Cobros recurrentes y facturación',
         'stripe-node + webhook + portal', 'src/app/api/stripe/ + src/lib/stripe.ts'],
    ], col_widths=[0.12, 0.30, 0.25, 0.33]))
    story.append(Spacer(1, 4))

    story.append(add_heading('1.2 · Requisitos previos', style_h2, level=1))
    story.append(Paragraph(
        'Antes de empezar necesitas un proyecto Next.js 16+ con TypeScript, una '
        'base de datos PostgreSQL (recomendamos Neon o Supabase para producción, '
        'o Postgres local para desarrollo), y Node.js 18+. Para la parte de Stripe '
        'necesitarás además una cuenta de Stripe (puede ser test mode mientras '
        'desarrollas). No se requiere experiencia previa con ninguna de las '
        'librerías: el manual cubre todo desde cero.', style_body))

    story.append(bullet_list([
        '<b>Node.js 18+</b> con soporte para TypeScript 5 y Next.js 16 (App Router).',
        '<b>PostgreSQL 14+</b> accesible vía Prisma. Para producción recomendamos Neon '
        'por su tier free generoso y branching para staging.',
        '<b>Cuenta Stripe</b> con acceso al Dashboard (test mode es suficiente para '
        'desarrollo; necesitarás live mode cuando cobres clientes reales).',
        '<b>Editor con soporte TypeScript</b> para autocompletar los tipos de Stripe '
        'y Playwright.',
        '<b>Git</b> para versionar los tests y la spec OpenAPI junto al código.',
    ]))

    story.append(add_heading('1.3 · Convenciones del manual', style_h2, level=1))
    story.append(Paragraph(
        'Los bloques de código están en monoespaciado con fondo gris claro. Los '
        'comandos que se ejecutan en terminal llevan prefijo <font name="FreeMono">"$"</font>. '
        'Las rutas de archivos son relativas a la raíz del proyecto a menos que se '
        'indique lo contrario. Las notas y advertencias aparecen en recuadros '
        'amarillos. Cuando una variable de entorno lleva el prefijo '
        '<font name="FreeMono">STRIPE_</font> o <font name="FreeMono">SUNAT_</font>, '
        'es sensible y no debe commitearse al repositorio.', style_body))

    story.append(callout(
        'Si estás configurando estas piezas en un proyecto existente, te '
        'recomendamos crear una rama <font name="FreeMono">feat/billing-tests-docs</font> '
        'y hacer commits por capítulo. Así puedes revertir un capítulo sin afectar '
        'los otros si algo sale mal.', 'info'))

    story.append(PageBreak())

    # ─── Capítulo 2: Pruebas E2E con Playwright ────────────────────────────
    story.append(add_heading('Capítulo 2 · Pruebas E2E con Playwright', style_h1, level=0))
    story.append(HRule(thickness=1, color=HEADER_FILL, space_after=8))

    story.append(Paragraph(
        'Las pruebas end-to-end (E2E) simulan un usuario real navegando tu '
        'aplicación: abren un navegador, hacen clic en botones, rellenan formularios '
        'y verifican que la UI responde correctamente. Son la última línea de '
        'defensa antes de production: si un test E2E pasa, tienes alta confianza '
        'de que el flujo completo (frontend + API + base de datos) funciona. '
        'Playwright es la librería moderna recomendada: soporta Chromium, Firefox '
        'y WebKit, tiene auto-waiting inteligente, y graba traces completos cuando '
        'un test falla para que puedas depurarlo offline.', style_body))

    story.append(add_heading('2.1 · Instalación y configuración inicial', style_h2, level=1))
    story.append(Paragraph(
        'Playwright se distribuye como un paquete npm con sus propios binarios de '
        'navegador. La instalación es en dos pasos: primero el paquete npm y luego '
        'los binarios de navegador. Los binarios ocupan ~300MB pero son necesarios '
        'para ejecutar las pruebas en headless mode.', style_body))

    story.append(code_block('''# Instalar Playwright como dependencia de desarrollo
npm install --save-dev @playwright/test

# Descargar los binarios de navegador (Chromium por defecto)
npx playwright install chromium

# Verificar la instalación
npx playwright --version'''))

    story.append(Paragraph(
        'A continuación crea el archivo <font name="FreeMono">playwright.config.ts</font> '
        'en la raíz del proyecto. Esta configuración define dónde están los tests, '
        'qué navegador usar, y cómo arrancar el dev server automáticamente cuando '
        'corres los tests en local. En CI se asume que el servidor ya está corriendo '
        '(lo arranca el propio pipeline).', style_body))

    story.append(code_block('''// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/healthz',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})'''))

    story.append(Paragraph(
        'El campo <font name="FreeMono">webServer</font> es clave: le dice a '
        'Playwright que arranque tu dev server antes de correr los tests y que '
        'espere a que <font name="FreeMono">/api/healthz</font> responda 200. Si ya '
        'hay un servidor corriendo en el puerto 3000, lo reutiliza. En CI '
        'desactivamos este comportamiento porque el servidor lo arranca el pipeline '
        'separadamente.', style_body))

    story.append(add_heading('2.2 · Estructura de los tests', style_h2, level=1))
    story.append(Paragraph(
        'Organiza los tests en la carpeta <font name="FreeMono">tests/e2e/</font> '
        'con un archivo <font name="FreeMono">.spec.ts</font> por dominio funcional. '
        'Cada archivo contiene un <font name="FreeMono">test.describe</font> por '
        'recurso y un <font name="FreeMono">test</font> por escenario. La granularidad '
        'recomendada es: <b>un test = un comportamiento verificable</b>. Si un test '
        'falla, debes poder entender qué funcionalidad se rompió mirando solo su '
        'nombre.', style_body))

    story.append(make_table([
        ['Archivo', 'Cobertura', 'Auth requerida'],
        ['public.spec.ts', 'Endpoints públicos + aplicación de auth', 'No'],
        ['api-core.spec.ts', 'Bots, Conversations, Contacts (CRUD completo)', 'Sí'],
        ['stripe.spec.ts', 'Planes, checkout, portal, webhook signature', 'Mixto'],
        ['ui-smoke.spec.ts', 'Home page, docs page, errores JS fatales', 'No'],
    ], col_widths=[0.30, 0.50, 0.20]))
    story.append(Spacer(1, 4))

    story.append(add_heading('2.3 · Ejemplo: test de endpoint público', style_h2, level=1))
    story.append(Paragraph(
        'Los tests de endpoints públicos son los más sencillos: no requieren '
        'autenticación y validan que la API responde con el status y shape '
        'esperados. Son excelentes como smoke test en CI porque detectan '
        'regresiones graves en segundos.', style_body))

    story.append(code_block('''// tests/e2e/public.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Public endpoints', () => {
  test('GET /api/healthz returns 200', async ({ request }) => {
    const res = await request.get('/api/healthz')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('GET /api/docs/json returns OpenAPI 3.1 spec', async ({ request }) => {
    const res = await request.get('/api/docs/json')
    expect(res.status()).toBe(200)
    const spec = await res.json()
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.paths['/api/bots']).toBeDefined()
  })

  test('GET /api/stripe/plans returns catalog (public)', async ({ request }) => {
    const res = await request.get('/api/stripe/plans')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(3)
  })
})'''))

    story.append(add_heading('2.4 · Tests con autenticación', style_h2, level=1))
    story.append(Paragraph(
        'Para endpoints protegidos necesitas pasar tu API key en el header '
        '<font name="FreeMono">Authorization: Bearer cf_xxx</font>. La práctica '
        'recomendada es leer la key de una variable de entorno '
        '<font name="FreeMono">ADMIN_API_KEY</font> y hacer '
        '<font name="FreeMono">test.skip</font> si no está definida. Así el test '
        'pasa en CI (donde sí hay key) y se omite en local si no la configuraste.', style_body))

    story.append(code_block('''// tests/e2e/api-core.spec.ts
import { test, expect } from '@playwright/test'

const API_KEY = process.env.ADMIN_API_KEY || ''
const headers = { Authorization: `Bearer ${API_KEY}` }

test.describe('Bots API', () => {
  test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

  test('list bots returns 200', async ({ request }) => {
    const res = await request.get('/api/bots', { headers })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('create + delete a bot', async ({ request }) => {
    const create = await request.post('/api/bots', {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { name: 'E2E Test Bot ' + Date.now(), channels: 'whatsapp' },
    })
    expect([200, 201]).toContain(create.status())
    const created = await create.json()
    const botId = created.data?.id || created.id

    const del = await request.delete(`/api/bots/${botId}`, { headers })
    expect([200, 204]).toContain(del.status())
  })
})'''))

    story.append(add_heading('2.5 · Tests de UI con captura de errores', style_h2, level=1))
    story.append(Paragraph(
        'Para tests de UI, lo más valioso no es solo verificar que el texto '
        'esperado está en pantalla, sino capturar errores JavaScript fatales que '
        'pueden ocurrir durante el render. El patrón siguiente captura todos los '
        '<font name="FreeMono">pageerror</font> y falla el test si hay alguno que '
        'no sea de hidratación (que son tolerados por React 19).', style_body))

    story.append(code_block('''// tests/e2e/ui-smoke.spec.ts
test('home page loads without fatal errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  const title = await page.title()
  expect(title).toContain('ChatFlow')

  // Toleramos errores de hidratación de React
  const fatalErrors = errors.filter(
    (e) => !e.includes('Hydration') && !e.includes('hydrat')
  )
  expect(fatalErrors, JSON.stringify(fatalErrors)).toEqual([])
})'''))

    story.append(add_heading('2.6 · Scripts de npm y ejecución', style_h2, level=1))
    story.append(Paragraph(
        'Agrega estos scripts a tu <font name="FreeMono">package.json</font> para '
        'estandarizar cómo se ejecutan los tests. El modo '
        '<font name="FreeMono">--ui</font> abre un inspector visual donde puedes '
        'ver cada paso del test, pausarlo y modificar selectores en vivo.', style_body))

    story.append(code_block('''{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}'''))

    story.append(Paragraph(
        'Para ejecutar los tests localmente necesitas el servidor corriendo. '
        'Playwright lo arranca automáticamente si no detecta ninguno en el puerto '
        '3000. Para forzar un servidor concreto (por ejemplo, un deploy de '
        'preview en Vercel), pasa <font name="FreeMono">BASE_URL</font> como '
        'variable de entorno.', style_body))

    story.append(code_block('''# Local con dev server auto-arrancado
npm run test:e2e

# Modo interactivo (recomendado para escribir tests nuevos)
npm run test:e2e:ui

# Contra un deploy de preview
BASE_URL=https://chatflow-preview.vercel.app \\
  ADMIN_API_KEY=cf_xxx \\
  npm run test:e2e

# Ver reporte HTML de la última corrida
npm run test:e2e:report'''))

    story.append(callout(
        'En CI (GitHub Actions, Vercel Preview Deployments) define siempre '
        '<font name="FreeMono">CI=true</font> para activar los reintentos y '
        'reducir falsos negativos por flakes de red.', 'info'))

    story.append(add_heading('2.7 · Lista de verificación', style_h2, level=1))
    story.append(bullet_list([
        '<font name="FreeSans-Bold">@playwright/test</font> instalado como devDependency',
        'Binarios de Chromium descargados con <font name="FreeMono">npx playwright install chromium</font>',
        '<font name="FreeMono">playwright.config.ts</font> en la raíz con webServer configurado',
        'Al menos un <font name="FreeMono">.spec.ts</font> por dominio en <font name="FreeMono">tests/e2e/</font>',
        'Scripts <font name="FreeMono">test:e2e</font>, <font name="FreeMono">test:e2e:ui</font> y <font name="FreeMono">test:e2e:report</font> en package.json',
        'Tests de endpoints públicos pasan sin configuración adicional',
        'Tests de endpoints protegidos se skippean correctamente sin <font name="FreeMono">ADMIN_API_KEY</font>',
    ]))

    story.append(PageBreak())

    # ─── Capítulo 3: OpenAPI / Swagger ─────────────────────────────────────
    story.append(add_heading('Capítulo 3 · Documentación API con OpenAPI', style_h1, level=0))
    story.append(HRule(thickness=1, color=HEADER_FILL, space_after=8))

    story.append(Paragraph(
        'OpenAPI 3.1 es el estándar de la industria para describir APIs REST. Una '
        'vez que tienes una spec OpenAPI válida, puedes generar automáticamente '
        'documentación interactiva (con botón "try-it-now"), clientes SDK en '
        'cualquier lenguaje, mocks para tests, y colecciones de Postman. La '
        'alternativa — mantener un README con ejemplos sueltos — siempre se '
        'desactualiza y genera fricción con los integradores. En este capítulo '
        'configuramos una spec OpenAPI 3.1 servida desde tu propia API y '
        'renderizada con Scalar (la UI moderna preferida sobre Swagger UI '
        'clásico).', style_body))

    story.append(add_heading('3.1 · Instalación de dependencias', style_h2, level=1))
    story.append(Paragraph(
        'Necesitas tres paquetes: <font name="FreeSans-Bold">openapi-types</font> '
        'para los tipos TypeScript de la spec, '
        '<font name="FreeSans-Bold">@scalar/api-reference-react</font> para la UI '
        'interactiva, y opcionalmente '
        '<font name="FreeSans-Bold">swagger-ui-react</font> si prefieres la UI '
        'clásica. Scalar es más moderna, más rápida y con mejor UX móvil.', style_body))

    story.append(code_block('''# Dependencias de runtime
npm install @scalar/api-reference-react @scalar/api-reference

# Dependencias de tipos (devDependency)
npm install --save-dev openapi-types'''))

    story.append(add_heading('3.2 · Estructura de la spec OpenAPI', style_h2, level=1))
    story.append(Paragraph(
        'La spec vive en <font name="FreeMono">src/lib/openapi-spec.ts</font> como '
        'un objeto TypeScript tipado. Esto te da autocompletado en el editor y '
        'validación de tipos en build time. La estructura sigue la especificación '
        'OpenAPI 3.1: <font name="FreeMono">info</font> (metadatos), '
        '<font name="FreeMono">servers</font> (URLs base), '
        '<font name="FreeMono">tags</font> (agrupaciones de endpoints), '
        '<font name="FreeMono">components</font> (esquemas reutilizables), y '
        '<font name="FreeMono">paths</font> (los endpoints propiamente dichos).', style_body))

    story.append(code_block('''// src/lib/openapi-spec.ts
import type { OpenAPIV3_1 } from 'openapi-types'

export const openApiSpec: OpenAPIV3_1.Document = {
  openapi: '3.1.0',
  info: {
    title: 'ChatFlow API',
    version: '1.0.0',
    description: `API REST de ChatFlow — plataforma omnicanal de chatbots.

## Autenticación
Todas las peticiones requieren API Key:
\\`\\`\\`http
Authorization: Bearer cf_xxxxxxxxxxxxxxx
\\`\\`\\``,
    contact: { name: 'Soporte', email: 'soporte@chatflow.pe' },
    license: { name: 'MIT', url: 'https://opensource.org/license/mit' },
  },
  servers: [
    { url: '/', description: 'Relative (mismo dominio)' },
    { url: 'https://api.chatflow.pe', description: 'Producción' },
  ],
  tags: [
    { name: 'Auth', description: 'API keys y permisos' },
    { name: 'Bots', description: 'Gestión de bots' },
    { name: 'Stripe', description: 'Facturación' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Usa `Authorization: Bearer cf_xxx`',
      },
    },
    schemas: {
      Bot: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          channels: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'paused', 'draft'] },
        },
        required: ['id', 'name'],
      },
    },
  },
  paths: {
    '/api/bots': {
      get: {
        tags: ['Bots'],
        summary: 'Lista todos los bots',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'Lista de bots',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Bot' } },
                  },
                },
              },
            },
          },
          '401': { description: 'API key inválida o ausente' },
        },
      },
    },
  },
}'''))

    story.append(callout(
        'Mantén la spec en TypeScript (no en YAML). Te da autocompletado, '
        'validación de tipos y refactor seguro. Los YAMLs son propensos a '
        'errores de indentación que se descubren solo en runtime.', 'info'))

    story.append(add_heading('3.3 · Endpoint que sirve la spec', style_h2, level=1))
    story.append(Paragraph(
        'Crea un endpoint <font name="FreeMono">/api/docs/json</font> que '
        'devuelva la spec como JSON. Es público (sin auth) para que herramientas '
        'externas como Postman, Insomnia o Stoplight puedan importarlo.', style_body))

    story.append(code_block('''// src/app/api/docs/json/route.ts
import { NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi-spec'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: { 'Cache-Control': 'no-store' },
  })
}'''))

    story.append(add_heading('3.4 · Página /docs con Scalar UI', style_h2, level=1))
    story.append(Paragraph(
        'La UI de documentación vive en <font name="FreeMono">/docs</font> y usa '
        'el componente <font name="FreeMono">ApiReferenceReact</font> de Scalar. '
        'Es importante cargarlo con <font name="FreeMono">dynamic</font> y '
        '<font name="FreeMono">ssr: false</font> porque Scalar solo funciona en '
        'cliente. La página hace fetch de la spec JSON al montarse y se la pasa '
        'al componente.', style_body))

    story.append(code_block('''// src/app/docs/page.tsx
'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const ApiReferenceReact = dynamic(
  () => import('@scalar/api-reference-react').then((m) => m.ApiReferenceReact),
  { ssr: false, loading: () => <div>Cargando documentación…</div> }
)

export default function DocsPage() {
  const [spec, setSpec] = useState<object | null>(null)

  useEffect(() => {
    fetch('/api/docs/json')
      .then((r) => r.json())
      .then(setSpec)
      .catch(() => setSpec(null))
  }, [])

  if (!spec) return <div>Cargando…</div>

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ApiReferenceReact
        configuration={{
          spec: { content: spec as any },
          theme: 'purple',
          layout: 'modern',
          darkMode: true,
          showSidebar: true,
          hideTestRequestButton: false,
          metaData: { title: 'ChatFlow API Docs' },
        }}
      />
    </div>
  )
}'''))

    story.append(Paragraph(
        'Con esto, al abrir <font name="FreeMono">/docs</font> en tu navegador '
        'ves la documentación completa con buscador, panel lateral, esquemas '
        'expandibles, ejemplos, y botón "Try it" que dispara requests reales '
        'contra tu API. No necesitas mantener un portal de docs aparte: la UI '
        'se actualiza sola cada vez que cambia la spec.', style_body))

    story.append(add_heading('3.5 · Convenciones y buenas prácticas', style_h2, level=1))
    story.append(bullet_list([
        '<b>Un endpoint = una entrada en paths.</b> Si añades un endpoint nuevo, '
        'añádelo también a la spec en el mismo PR. Es la única forma de mantener '
        'la doc sincronizada.',
        '<b>Usa $ref para esquemas reutilizables.</b> El modelo Bot aparece en '
        'muchos endpoints: defínelo una vez en components/schemas y refléjalo '
        'con <font name="FreeMono">$ref: \'#/components/schemas/Bot\'</font>.',
        '<b>Documenta los errores.</b> Cada endpoint debe documentar al menos '
        '400 (bad request), 401 (no auth) y 500 (server error) con ejemplos.',
        '<b>Descripciones en español si tu audiencia es hispana.</b> El título '
        'y la descripción de la spec son lo primero que ve el integrador.',
        '<b>Versionado semántico en info.version.</b> Bumpéa el minor cuando '
        'añades endpoints, el major cuando rompes compatibilidad.',
    ]))

    story.append(add_heading('3.6 · Test E2E para la documentación', style_h2, level=1))
    story.append(Paragraph(
        'La spec OpenAPI es un contrato: si rompes un endpoint sin actualizar '
        'la spec, los integradores se enteran cuando ya es tarde. El test E2E '
        'siguiente valida que la spec sigue sirviéndose correctamente y que '
        'los paths clave siguen presentes.', style_body))

    story.append(code_block('''test('GET /api/docs/json returns OpenAPI 3.1 spec', async ({ request }) => {
  const res = await request.get('/api/docs/json')
  expect(res.status()).toBe(200)
  const spec = await res.json()
  expect(spec.openapi).toBe('3.1.0')
  expect(spec.info.title).toBe('ChatFlow API')
  expect(spec.paths['/api/bots']).toBeDefined()
  expect(spec.paths['/api/stripe/checkout']).toBeDefined()
})

test('GET /docs renders Scalar API reference', async ({ page }) => {
  await page.goto('/docs')
  await page.waitForLoadState('networkidle')
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 })
  expect(bodyText.toLowerCase()).toContain('chatflow')
})'''))

    story.append(add_heading('3.7 · Lista de verificación', style_h2, level=1))
    story.append(bullet_list([
        '<font name="FreeSans-Bold">openapi-types</font> y <font name="FreeSans-Bold">@scalar/api-reference-react</font> instalados',
        '<font name="FreeMono">src/lib/openapi-spec.ts</font> exportando un objeto tipado <font name="FreeMono">OpenAPIV3_1.Document</font>',
        'Endpoint <font name="FreeMono">GET /api/docs/json</font> devolviendo la spec como JSON',
        'Página <font name="FreeMono">/docs</font> con Scalar cargando la spec dinámicamente',
        'Todos los endpoints públicos documentados con response 200 y 401 mínimo',
        'Test E2E que valida que <font name="FreeMono">/api/docs/json</font> responde 200 con openapi 3.1.0',
    ]))

    story.append(PageBreak())

    # ─── Capítulo 4: Stripe ────────────────────────────────────────────────
    story.append(add_heading('Capítulo 4 · Integración Stripe real', style_h1, level=0))
    story.append(HRule(thickness=1, color=HEADER_FILL, space_after=8))

    story.append(Paragraph(
        'Stripe es el procesador de pagos estándar de la industria SaaS. Maneja '
        'compliance PCI-DSS, suscripciones recurrentes, dunning automático, y '
        'emite facturas que la mayoría de negocios puede usar directamente. En '
        'este capítulo configuramos el flujo completo: catálogo de planes, '
        'checkout, webhook con verificación de firma, customer portal, y la '
        'tabla <font name="FreeMono">Subscription</font> local que mantiene el '
        'estado sincronizado. La integración funciona sin SUNAT: las facturas '
        'que emite Stripe son suficientes para la mayoría de casos. Cuando '
        'necesites facturación electrónica Perú (SUNAT), se añade encima sin '
        'romper nada.', style_body))

    story.append(add_heading('4.1 · Modelo de datos en Prisma', style_h2, level=1))
    story.append(Paragraph(
        'Necesitas dos modelos en tu schema Prisma: '
        '<font name="FreeSans-Bold">Subscription</font> (estado actual de la '
        'suscripción del cliente: plan, límites, fechas) e '
        '<font name="FreeSans-Bold">Invoice</font> (registro de cada factura '
        'emitida, con su PDF y estado). Ambos se actualizan automáticamente '
        'desde el webhook de Stripe, no desde la UI del cliente.', style_body))

    story.append(code_block('''// prisma/schema.prisma
model Subscription {
  id                  String    @id @default(cuid())
  customerId          String    @unique // tu identificador interno
  plan                String    @default("free")
  status              String    @default("active")
  seats               Int       @default(1)
  conversationsLimit  Int       @default(100)
  messagesLimit       Int       @default(1000)
  stripeCustomerId    String?   @unique
  stripeSubscriptionId String?  @unique
  stripePriceId       String?
  cancelAtPeriodEnd   Boolean   @default(false)
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  invoices            Invoice[]
}

model Invoice {
  id                  String    @id @default(cuid())
  subscriptionId      String?
  subscription        Subscription? @relation(fields: [subscriptionId], references: [id])
  stripeInvoiceId     String    @unique
  amount              Int       // en centavos
  currency            String    @default("usd")
  status              String    @default("open") // open|paid|uncollectible|void
  pdfUrl              String?
  hostedInvoiceUrl    String?
  createdAt           DateTime  @default(now())
}'''))

    story.append(Paragraph(
        'Después de editar el schema, ejecuta '
        '<font name="FreeMono">npx prisma db push</font> para aplicar los cambios '
        'a la base de datos y <font name="FreeMono">npx prisma generate</font> '
        'para regenerar el cliente TypeScript.', style_body))

    story.append(add_heading('4.2 · Instalación y cliente singleton', style_h2, level=1))
    story.append(code_block('# Instalar el SDK oficial de Stripe para Node\nnpm install stripe'))

    story.append(Paragraph(
        'El cliente Stripe debe ser un singleton para evitar crear conexiones '
        'innecesarias en serverless. Importante: <b>devuelve null si no hay '
        'STRIPE_SECRET_KEY configurada</b>, para que la app siga funcionando en '
        'entornos sin billing (dev local, PR previews, etc.).', style_body))

    story.append(code_block('''// src/lib/stripe.ts
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  _stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
  })
  return _stripe
}

// Catálogo de planes (debe coincidir con los products/prices en Stripe Dashboard)
export const PLANS = [
  { id: 'free', name: 'Free', priceMonthly: 0, conversationsLimit: 100, seats: 1 },
  { id: 'pro', name: 'Pro', priceMonthly: 4900, conversationsLimit: 5000, seats: 3,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL },
  { id: 'business', name: 'Business', priceMonthly: 14900, conversationsLimit: 25000, seats: 10,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL },
] as const

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export function constructStripeEvent(payload: string | Buffer, signature: string): Stripe.Event {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe no configurado')
  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)
}'''))

    story.append(add_heading('4.3 · Configurar productos y precios en Stripe', style_h2, level=1))
    story.append(Paragraph(
        'Tienes dos opciones para crear los productos y precios en Stripe: '
        'manualmente vía Dashboard, o automáticamente con el script '
        '<font name="FreeMono">scripts/setup-stripe.ts</font> que viene con el '
        'proyecto. El script es idempotente: lo puedes correr varias veces y '
        'solo crea lo que falta. Recomendamos el script porque evita errores '
        'manuales y deja el setup reproducible.', style_body))

    story.append(code_block('''# Opción A: Script asistido (recomendado)
# Crea products + prices automáticamente y escribe los IDs en .env
STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/setup-stripe.ts --write

# Opción B: Manual vía Dashboard
# 1. Ve a https://dashboard.stripe.com/products
# 2. Crea producto "ChatFlow Pro" con price mensual $49 USD y anual $470 USD
# 3. Crea producto "ChatFlow Business" con price mensual $149 USD y anual $1430 USD
# 4. Copia los price_xxx a tu .env'''))

    story.append(Paragraph(
        'El output del script te muestra los cuatro '
        '<font name="FreeMono">price_xxx</font> que debes copiar a tu '
        '<font name="FreeMono">.env</font>: <font name="FreeMono">STRIPE_PRICE_PRO_MONTHLY</font>, '
        '<font name="FreeMono">STRIPE_PRICE_PRO_ANNUAL</font>, '
        '<font name="FreeMono">STRIPE_PRICE_BUSINESS_MONTHLY</font> y '
        '<font name="FreeMono">STRIPE_PRICE_BUSINESS_ANNUAL</font>. Sin estos '
        'cuatro valores, el endpoint de checkout devuelve 500.', style_body))

    story.append(add_heading('4.4 · Endpoint de checkout', style_h2, level=1))
    story.append(Paragraph(
        'El endpoint <font name="FreeMono">POST /api/stripe/checkout</font> crea '
        'una Stripe Checkout Session y devuelve la URL a la que el frontend debe '
        'redirigir al usuario. Recibe el plan solicitado y tu '
        '<font name="FreeMono">customerId</font> interno (puede ser el user id, '
        'workspace id, etc.). El <font name="FreeMono">customerId</font> viaja '
        'como metadata y permite al webhook asociar el evento de vuelta a tu '
        'base de datos local.', style_body))

    story.append(code_block('''// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PLANS } from '@/lib/stripe'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const { plan: planId, annual, customerId, customerEmail } = body
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan || plan.id === 'free' || plan.id === 'enterprise') {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }
  const priceId = annual ? plan.stripePriceIdAnnual : plan.stripePriceId
  if (!priceId) {
    return NextResponse.json({ error: 'Price ID no configurado' }, { status: 500 })
  }

  // Reusa el stripeCustomerId si el cliente ya tenía uno
  const existingSub = await db.subscription.findUnique({ where: { customerId } })
  const stripeCustomerId = existingSub?.stripeCustomerId || undefined

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    customer_email: stripeCustomerId ? undefined : customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?billing=cancel`,
    metadata: { planId: plan.id, customerId, annual: String(annual) },
    subscription_data: { metadata: { planId: plan.id, customerId } },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    customer_creation: stripeCustomerId ? undefined : 'always',
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}'''))

    story.append(add_heading('4.5 · Webhook con verificación de firma', style_h2, level=1))
    story.append(Paragraph(
        'El webhook <font name="FreeMono">POST /api/stripe/webhook</font> es la '
        'pieza más crítica: recibe eventos de Stripe (pago realizado, '
        'suscripción actualizada, etc.) y actualiza tu base de datos local. '
        'Tres cosas son obligatorias: (1) leer el body como texto plano (no '
        'JSON parseado, porque la firma se calcula sobre el raw), (2) verificar '
        'la firma con <font name="FreeMono">stripe.webhooks.constructEvent</font>, '
        'y (3) responder 200 rápido para evitar reintentos de Stripe.', style_body))

    story.append(code_block('''// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStripe, constructStripeEvent, STRIPE_WEBHOOK_SECRET, getPlan } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  if (!STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Sin webhook secret' }, { status: 503 })

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Falta signature' }, { status: 400 })

  const rawBody = await req.text()  // ← CRÍTICO: texto plano, no JSON
  let event
  try {
    event = constructStripeEvent(rawBody, signature)
  } catch (e) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as any)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as any)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as any)
        break
      // ... otros eventos
    }
    return NextResponse.json({ received: true, type: event.type })
  } catch (e) {
    console.error('Stripe webhook error', e)
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 })
  }
}'''))

    story.append(callout(
        'El body debe leerse con <font name="FreeMono">await req.text()</font> y '
        '<b>nunca</b> con <font name="FreeMono">await req.json()</font>. La firma '
        'HMAC de Stripe se calcula sobre el raw payload; si Next.js lo parsea '
        'como JSON y luego lo re-serializa, los bytes cambian y la firma nunca '
        'coincide.', 'warn'))

    story.append(add_heading('4.6 · Webhook local con Stripe CLI', style_h2, level=1))
    story.append(Paragraph(
        'Para desarrollo local necesitas el Stripe CLI, que escucha eventos de '
        'tu cuenta Stripe (test mode) y los reenvía a tu localhost. El CLI te '
        'imprime un <font name="FreeMono">whsec_xxx</font> que debes usar como '
        '<font name="FreeMono">STRIPE_WEBHOOK_SECRET</font> en tu '
        '<font name="FreeMono">.env</font>. Sin ese secret, la verificación de '
        'firma siempre falla.', style_body))

    story.append(code_block('''# Instala Stripe CLI: https://stripe.com/docs/stripe-cli
# En una terminal, escucha y reenvía:
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Output:
# > Ready! Your webhook signing secret is whsec_xxxxxxxx (^C to quit)
# Copia whsec_xxx a tu .env como STRIPE_WEBHOOK_SECRET

# En otra terminal, dispara eventos de prueba:
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted'''))

    story.append(Paragraph(
        'Hemos incluido un script <font name="FreeMono">npm run stripe:listen</font> '
        'en el <font name="FreeMono">package.json</font> que ejecuta el comando '
        'anterior automáticamente. Recuerda actualizar '
        '<font name="FreeMono">STRIPE_WEBHOOK_SECRET</font> en tu '
        '<font name="FreeMono">.env</font> cada vez que reinicies el CLI: el '
        'secret cambia entre sesiones.', style_body))

    story.append(add_heading('4.7 · Customer Portal', style_h2, level=1))
    story.append(Paragraph(
        'El Customer Portal de Stripe es una página hospedada en '
        '<font name="FreeMono">billing.stripe.com</font> donde el cliente puede '
        'cambiar método de pago, ver facturas anteriores, actualizar plan o '
        'cancelar la suscripción. Te ahorra construir toda esa UI. El endpoint '
        '<font name="FreeMono">POST /api/stripe/portal</font> crea una sesión '
        'del portal y devuelve la URL a la que redirigir al usuario.', style_body))

    story.append(code_block('''// src/app/api/stripe/portal/route.ts
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })

  const { customerId } = await req.json().catch(() => ({}))
  if (!customerId) return NextResponse.json({ error: 'customerId requerido' }, { status: 400 })

  const sub = await db.subscription.findUnique({ where: { customerId } })
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 404 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/?billing=portal`,
  })
  return NextResponse.json({ url: session.url })
}'''))

    story.append(add_heading('4.8 · Endpoint público de planes', style_h2, level=1))
    story.append(Paragraph(
        'El endpoint <font name="FreeMono">GET /api/stripe/plans</font> es '
        'público (sin auth) y devuelve el catálogo de planes con sus precios y '
        'límites. Lo usa la página de pricing pública para renderizar la tabla '
        'de comparación. Es importante que sea público: los clientes '
        'potenciales deben ver los precios sin registrarse.', style_body))

    story.append(add_heading('4.9 · Variables de entorno', style_h2, level=1))
    story.append(Paragraph(
        'Todas las variables de Stripe empiezan con '
        '<font name="FreeMono">STRIPE_</font>. Las que empiezan con '
        '<font name="FreeMono">STRIPE_PRICE_</font> son los IDs de precio que '
        'copias del Dashboard (o que el script setup-stripe.ts escribe por ti). '
        'En producción usas <font name="FreeMono">sk_live_</font>, en test '
        '<font name="FreeMono">sk_test_</font>. Nunca mezcles: si usas live '
        'con price IDs de test, Stripe rechaza la transacción.', style_body))

    story.append(make_table([
        ['Variable', 'Ejemplo', 'Origen'],
        ['STRIPE_SECRET_KEY', 'sk_test_51NxXXX...',
         'Stripe Dashboard → Developers → API keys'],
        ['STRIPE_WEBHOOK_SECRET', 'whsec_xXXXX...',
         'Output del stripe listen (dev) o Dashboard → Webhooks (prod)'],
        ['STRIPE_PRICE_PRO_MONTHLY', 'price_1PxXX...',
         'Dashboard → Products o script setup-stripe.ts'],
        ['STRIPE_PRICE_PRO_ANNUAL', 'price_1PxXX...',
         'Dashboard → Products o script setup-stripe.ts'],
        ['STRIPE_PRICE_BUSINESS_MONTHLY', 'price_1PxXX...',
         'Dashboard → Products o script setup-stripe.ts'],
        ['STRIPE_PRICE_BUSINESS_ANNUAL', 'price_1PxXX...',
         'Dashboard → Products o script setup-stripe.ts'],
        ['NEXT_PUBLIC_APP_URL', 'https://app.chatflow.pe',
         'Tu dominio de producción'],
    ], col_widths=[0.30, 0.30, 0.40]))
    story.append(Spacer(1, 4))

    story.append(add_heading('4.10 · Lista de verificación', style_h2, level=1))
    story.append(bullet_list([
        'Paquete <font name="FreeSans-Bold">stripe</font> instalado',
        '<font name="FreeMono">src/lib/stripe.ts</font> con <font name="FreeMono">getStripe()</font> singleton y catálogo de planes',
        'Modelos <font name="FreeSans-Bold">Subscription</font> e <font name="FreeSans-Bold">Invoice</font> en Prisma',
        'Endpoint <font name="FreeMono">POST /api/stripe/checkout</font> con auth',
        'Endpoint <font name="FreeMono">POST /api/stripe/webhook</font> que verifica firma con <font name="FreeMono">req.text()</font>',
        'Endpoint <font name="FreeMono">POST /api/stripe/portal</font> con auth',
        'Endpoint <font name="FreeMono">GET /api/stripe/plans</font> público',
        'Variables de entorno STRIPE_* configuradas en dev y producción',
        'Stripe CLI escuchando en desarrollo local',
        'Webhook de producción creado en Stripe Dashboard → Webhooks',
        'Test E2E que valida que la firma inválida devuelve 400',
    ]))

    story.append(PageBreak())

    # ─── Capítulo 5: Verificación ──────────────────────────────────────────
    story.append(add_heading('Capítulo 5 · Verificación y operación', style_h1, level=0))
    story.append(HRule(thickness=1, color=HEADER_FILL, space_after=8))

    story.append(Paragraph(
        'Una vez configuradas las tres piezas, este capítulo te muestra cómo '
        'verificar que todo funciona end-to-end y cómo operarlas en el día a '
        'día. Incluye comandos de smoke test, flujos de depuración para los '
        'problemas más comunes, y un runbook para cuando algo falle en '
        'producción. La regla de oro es: si los tests E2E pasan y el webhook '
        'de Stripe responde 200, tienes alta confianza de que el sistema '
        'funciona. Si algo falla, los pasos siguientes te dicen dónde mirar.', style_body))

    story.append(add_heading('5.1 · Smoke test completo', style_h2, level=1))
    story.append(Paragraph(
        'Después de cualquier deploy, ejecuta este smoke test de 30 segundos. '
        'Valida que la API responde, que la documentación carga, que el catálogo '
        'de planes es accesible, y que los endpoints protegidos rechazan '
        'peticiones sin auth. Si todos los checks pasan, el deploy es sano.', style_body))

    story.append(code_block('''# 1. Healthcheck
curl -s https://TU_DOMINIO/api/healthz | jq .
# Esperado: { "status": "ok", ... }

# 2. OpenAPI spec
curl -s https://TU_DOMINIO/api/docs/json | jq '.info.title'
# Esperado: "ChatFlow API"

# 3. Planes públicos
curl -s https://TU_DOMINIO/api/stripe/plans | jq '.data | length'
# Esperado: 3 o 4 (free, pro, business, [enterprise])

# 4. Auth enforcement (debe fallar con 401)
curl -s -o /dev/null -w "%{http_code}" https://TU_DOMINIO/api/bots
# Esperado: 401

# 5. Webhook signature inválida (debe fallar con 400)
curl -s -X POST https://TU_DOMINIO/api/stripe/webhook \\
  -H "stripe-signature: invalid" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"evt_test"}'
# Esperado: {"error":"Firma inválida"}'''))

    story.append(add_heading('5.2 · Tests E2E en CI', style_h2, level=1))
    story.append(Paragraph(
        'En CI (Vercel Preview Deployments, GitHub Actions) los tests E2E '
        'deben correr en cada PR. La variable '
        '<font name="FreeMono">CI=true</font> activa reintentos y desactiva el '
        'auto-arranque del dev server. Pasa '
        '<font name="FreeMono">BASE_URL</font> apuntando al deploy de preview '
        'y <font name="FreeMono">ADMIN_API_KEY</font> con una key de test '
        'dedicada para CI.', style_body))

    story.append(code_block('''# Ejemplo: GitHub Actions
name: E2E Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          CI: 'true'
          BASE_URL: ${{ secrets.PREVIEW_URL }}
          ADMIN_API_KEY: ${{ secrets.CI_API_KEY }}'''))

    story.append(add_heading('5.3 · Debug de webhooks que no llegan', style_h2, level=1))
    story.append(Paragraph(
        'El problema más común con Stripe es que los webhooks no llegan o no '
        'se procesan correctamente. Sigue estos pasos en orden: (1) verifica '
        'que el endpoint devuelve 200 con curl, (2) revisa el log de eventos '
        'en Stripe Dashboard → Developers → Events, (3) si los eventos aparecen '
        'como "failed", mira el response body que Stripe guardó — suele contener '
        'el error exacto.', style_body))

    story.append(bullet_list([
        '<b>Webhook retorna 400 "Firma inválida":</b> el '
        '<font name="FreeMono">STRIPE_WEBHOOK_SECRET</font> en tu .env no '
        'coincide con el del endpoint. En dev local el secret cambia cada vez '
        'que reinicias <font name="FreeMono">stripe listen</font>.',
        '<b>Webhook retorna 503 "Stripe no configurado":</b> falta '
        '<font name="FreeMono">STRIPE_SECRET_KEY</font> en las variables de '
        'entorno. Verifica que esté en el dashboard de Vercel y que el deploy '
        'haya terminado.',
        '<b>Eventos aparecen como sent pero no procesados:</b> tu endpoint está '
        'caído o respondiendo 500. Revisa los logs de Vercel en tiempo real '
        'mientras Stripe reintenta.',
        '<b>Subscription no se crea en la DB local:</b> el '
        '<font name="FreeMono">customerId</font> del metadata de la Checkout '
        'Session no coincide con ningún registro en tu tabla Subscription. '
        'Verifica que lo estás pasando correctamente al crear la sesión.',
    ]))

    story.append(add_heading('5.4 · Monitoreo continuo', style_h2, level=1))
    story.append(Paragraph(
        'Para producción necesitas visibilidad sobre tres cosas: (1) que los '
        'tests E2E pasan en cada deploy, (2) que el webhook de Stripe responde '
        '200 consistentemente, y (3) que las suscripciones activas crecen o se '
        'mantienen. Mínimo recomendado: un cron que ejecute los tests E2E cada '
        'hora contra producción, alertas de Vercel/Stripe para webhooks '
        'fallidos, y un dashboard simple que muestre MRR y suscripciones '
        'activas (lo puedes construir con una query SQL directa).', style_body))

    story.append(PageBreak())

    # ─── Apéndice A: Variables de entorno ──────────────────────────────────
    story.append(add_heading('Apéndice A · Variables de entorno', style_h1, level=0))
    story.append(HRule(thickness=1, color=HEADER_FILL, space_after=8))

    story.append(Paragraph(
        'Lista completa de variables de entorno que el proyecto usa. Las marcadas '
        'como <b>Requerida</b> deben estar siempre presentes; las <b>Opcional</b> '
        'permiten que la app arranque sin ellas pero deshabilitan la funcionalidad '
        'correspondiente. Las marcadas <b>Sensible</b> no deben commitearse al '
        'repositorio: van en el dashboard de Vercel (o equivalente) y en el '
        '<font name="FreeMono">.env</font> local que está en '
        '<font name="FreeMono">.gitignore</font>.', style_body))

    story.append(make_table([
        ['Variable', 'Categoría', 'Req', 'Sensible'],
        ['DATABASE_URL', 'Base de datos', 'Sí', 'Sí'],
        ['DIRECT_URL', 'Base de datos (migraciones)', 'Sí', 'Sí'],
        ['GLM_API_KEY', 'IA (Z.ai)', 'No', 'Sí'],
        ['GLM_API_URL', 'IA (Z.ai)', 'No', 'No'],
        ['STRIPE_SECRET_KEY', 'Billing', 'Sí (para cobrar)', 'Sí'],
        ['STRIPE_WEBHOOK_SECRET', 'Billing', 'Sí (para webhook)', 'Sí'],
        ['STRIPE_PRICE_PRO_MONTHLY', 'Billing', 'Sí (plan pro)', 'No'],
        ['STRIPE_PRICE_PRO_ANNUAL', 'Billing', 'No', 'No'],
        ['STRIPE_PRICE_BUSINESS_MONTHLY', 'Billing', 'Sí (plan business)', 'No'],
        ['STRIPE_PRICE_BUSINESS_ANNUAL', 'Billing', 'No', 'No'],
        ['NEXT_PUBLIC_APP_URL', 'App URL', 'Sí (en prod)', 'No'],
        ['ADMIN_API_KEY', 'E2E tests', 'No (solo CI)', 'Sí'],
        ['BASE_URL', 'E2E tests', 'No (default localhost)', 'No'],
        ['SUNAT_ENABLED', 'SUNAT', 'No (default off)', 'No'],
        ['SUNAT_ISSUER_RUC', 'SUNAT', 'No', 'No'],
        ['SUNAT_SENDER_URL', 'SUNAT', 'No', 'Sí'],
        ['SUNAT_SENDER_TOKEN', 'SUNAT', 'No', 'Sí'],
    ], col_widths=[0.40, 0.25, 0.20, 0.15]))
    story.append(Spacer(1, 6))

    story.append(callout(
        'El archivo <font name="FreeMono">.env.example</font> del repositorio '
        'contiene todas estas variables comentadas con descripciones. Cópialo '
        'a <font name="FreeMono">.env</font> y rellena los valores. Nunca '
        'commitees el <font name="FreeMono">.env</font> real.', 'warn'))

    story.append(PageBreak())

    # ─── Apéndice B: Solución de problemas ─────────────────────────────────
    story.append(add_heading('Apéndice B · Solución de problemas', style_h1, level=0))
    story.append(HRule(thickness=1, color=HEADER_FILL, space_after=8))

    story.append(Paragraph(
        'Errores más comunes y cómo resolverlos. Si tu problema no está aquí, '
        'revisa los logs en Vercel (o tu plataforma de deploy), los eventos en '
        'Stripe Dashboard → Developers → Events, y los traces de Playwright '
        'que se guardan en <font name="FreeMono">test-results/</font> tras cada '
        'falla.', style_body))

    story.append(add_heading('B.1 · Playwright', style_h2, level=1))
    story.append(make_table([
        ['Síntoma', 'Causa probable', 'Solución'],
        ['Error: "Executable doesn\'t exist"',
         'Navegadores no instalados',
         'npx playwright install chromium'],
        ['Tests pasan en local pero fallan en CI',
         'Flaky timing o variable CI no seteada',
         'Añade retries: process.env.CI ? 1 : 0'],
        ['Test.skip salta todos los tests',
         'ADMIN_API_KEY no está en el entorno',
         'Exporta la variable antes de correr el test'],
        ['Error "page.goto: net::ERR_CONNECTION_REFUSED"',
         'Servidor no está corriendo',
         'El webServer del config debería arrancarlo; revisa que npm run dev funciona'],
        ['Timeout en waitForLoadState(networkidle)',
         'Hay requests de fondo (analytics, sockets) que no terminan',
         'Usa waitForLoadState("domcontentloaded") o un waitForTimeout'],
    ], col_widths=[0.30, 0.30, 0.40]))
    story.append(Spacer(1, 6))

    story.append(add_heading('B.2 · OpenAPI / Scalar', style_h2, level=1))
    story.append(make_table([
        ['Síntoma', 'Causa probable', 'Solución'],
        ['/docs muestra "Cargando…" infinito',
         'El fetch a /api/docs/json falla',
         'Verifica que el endpoint responde 200 con curl'],
        ['Scalar monta pero no ve endpoints',
         'El objeto paths está vacío o mal formado',
         'Imprime la spec con jq y valida que paths tiene entradas'],
        ['Error de TypeScript en openApi-spec.ts',
         'Versión incorrecta de openapi-types',
         'npm install openapi-types@12 — la 13 cambió la API'],
        ['"Try it" falla con CORS',
         'Backend en otro dominio sin CORS configurado',
         'Configura headers CORS en next.config.ts o sirve todo desde el mismo dominio'],
    ], col_widths=[0.30, 0.30, 0.40]))
    story.append(Spacer(1, 6))

    story.append(add_heading('B.3 · Stripe', style_h2, level=1))
    story.append(make_table([
        ['Síntoma', 'Causa probable', 'Solución'],
        ['Checkout devuelve 500 "Price ID no configurado"',
         'Falta STRIPE_PRICE_*_MONTHLY en .env',
         'Ejecuta scripts/setup-stripe.ts --write'],
        ['Webhook devuelve 400 "Firma inválida"',
         'STRIPE_WEBHOOK_SECRET incorrecto',
         'En dev: copia el secret del stripe listen. En prod: copia del Dashboard → Webhooks'],
        ['Webhook devuelve 503 "Stripe no configurado"',
         'Falta STRIPE_SECRET_KEY',
         'Añade sk_test_xxx (dev) o sk_live_xxx (prod) al .env'],
        ['Subscription no se crea en la DB',
         'customerId del metadata no coincide',
         'Verifica que pasas customerId al crear la Checkout Session'],
        ['Portal devuelve 404 "Sin suscripción activa"',
         'El cliente no tiene stripeCustomerId en la DB',
         'Espera a que llegue el evento checkout.session.completed'],
        ['Facturas se duplican en la DB',
         'Webhook se llamó dos veces (Stripe reintenta)',
         'Usa upsert con stripeInvoiceId como key única (ya lo hace el código del manual)'],
    ], col_widths=[0.30, 0.30, 0.40]))
    story.append(Spacer(1, 6))

    story.append(add_heading('B.4 · Comandos útiles', style_h2, level=1))
    story.append(code_block('''# Ver la spec OpenAPI formateada
curl -s https://TU_DOMINIO/api/docs/json | jq .

# Test manual del webhook con evento real de Stripe (dev local)
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted

# Ver eventos enviados por Stripe en dev local
stripe events list

# Reenviar un evento específico
stripe events resend evt_12345

# Listar suscripciones activas en tu DB
psql $DATABASE_URL -c "SELECT id, plan, status, \"currentPeriodEnd\" FROM \"Subscription\" WHERE status = \\'active\\';"

# Listar facturas pagadas del último mes
psql $DATABASE_URL -c "SELECT id, amount, currency, status FROM \"Invoice\" WHERE status = \\'paid\\' AND \"createdAt\" > NOW() - INTERVAL \\'30 days\\';"

# Ejecutar un único test de Playwright
npx playwright test tests/e2e/stripe.spec.ts -g "webhook endpoint rejects"

# Ver el trace de un test fallido
npx playwright show-trace test-results/.../trace.zip'''))

    story.append(Spacer(1, 12))
    story.append(HRule(thickness=1, color=ACCENT, space_after=4))
    story.append(Paragraph(
        '<i>Para soporte o reportar errores en este manual, contacta al equipo '
        'de DevOps o abre un issue en el repositorio del proyecto.</i>',
        style_muted))

    return story


def main():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    doc = TocDocTemplate(
        OUT_PATH,
        pagesize=A4,
        title='Manual de Configuración ChatFlow',
        author='ChatFlow Platform',
        subject='Configuración de E2E, OpenAPI y Stripe',
        creator='ChatFlow DevOps',
    )
    story = build_story()
    doc.multiBuild(story)
    print(f'Body PDF written to: {OUT_PATH}')
    print(f'Size: {os.path.getsize(OUT_PATH) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
