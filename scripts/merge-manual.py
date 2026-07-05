"""
merge-manual.py — Combina el cover y el body en el PDF final.
"""
import os
import sys
from pypdf import PdfWriter, PdfReader

COVER = '/home/z/my-project/workspace/scripts/manual-cover.pdf'
BODY = '/home/z/my-project/workspace/scripts/manual-body.pdf'
OUT_DIR = '/home/z/my-project/download'
OUT = os.path.join(OUT_DIR, 'Manual-Configuracion-ChatFlow.pdf')

os.makedirs(OUT_DIR, exist_ok=True)

writer = PdfWriter()
for pdf_path in [COVER, BODY]:
    reader = PdfReader(pdf_path)
    for page in reader.pages:
        writer.add_page(page)

# Set metadata
writer.add_metadata({
    '/Title': 'Manual de Configuracion ChatFlow',
    '/Author': 'ChatFlow Platform',
    '/Subject': 'Configuracion de E2E, OpenAPI y Stripe',
    '/Creator': 'ChatFlow DevOps',
    '/Producer': 'ChatFlow DevOps',
    '/Keywords': 'chatflow, e2e, playwright, openapi, swagger, stripe, billing',
})

with open(OUT, 'wb') as f:
    writer.write(f)

size_kb = os.path.getsize(OUT) / 1024
print(f'Final manual PDF: {OUT}')
print(f'Size: {size_kb:.1f} KB ({size_kb/1024:.2f} MB)')
print(f'Pages: {len(writer.pages)}')
