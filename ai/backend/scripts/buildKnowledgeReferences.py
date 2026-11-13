"""Build page-addressable knowledge text and reference PDFs for DOCX sources.

The six original PDFs keep their page numbers. DOCX sources get an explicitly
labelled text reference edition; its page numbers refer to that edition.
Requires reportlab and PyMuPDF for this preparation step only.
"""

import hashlib
import json
from pathlib import Path
import re
import sys
from xml.sax.saxutils import escape
import xml.etree.ElementTree as ET
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".cache/python"))
import pymupdf
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1] / "knowledgeBase"
SOURCES = ROOT / "sources"
REFERENCES = ROOT / "reference-pdfs"
CHUNKS = ROOT / "chunks"
WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def docx_paragraphs(source):
    with ZipFile(source) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
    paragraphs = []
    for paragraph in document.findall(".//w:body//w:p", WORD_NS):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", WORD_NS)).strip()
        if text:
            style = paragraph.find("w:pPr/w:pStyle", WORD_NS)
            style_name = style.attrib.get(f"{{{WORD_NS['w']}}}val", "") if style is not None else ""
            paragraphs.append((text, style_name))
    return paragraphs


def make_reference(source, destination):
    font_dir = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("KnowledgeArial", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("KnowledgeArialBold", str(font_dir / "arialbd.ttf")))
    styles = {
        "body": ParagraphStyle("body", fontName="KnowledgeArial", fontSize=10.5, leading=15, spaceAfter=7),
        "heading": ParagraphStyle("heading", fontName="KnowledgeArialBold", fontSize=13, leading=18, spaceBefore=12, spaceAfter=8, keepWithNext=True),
        "title": ParagraphStyle("title", fontName="KnowledgeArialBold", fontSize=18, leading=24, spaceAfter=12),
    }
    story = [
        Paragraph(escape(source.stem), styles["title"]),
        Paragraph("Bản PDF tham chiếu knowledge base", styles["heading"]),
        Paragraph(escape(f"Tài liệu nguồn {source.name}. Số trang trích dẫn áp dụng cho bản PDF tham chiếu này."), styles["body"]),
        Spacer(1, 12),
    ]
    paragraphs = docx_paragraphs(source)
    for text, style in paragraphs:
        is_heading = bool(re.search(r"heading|title", style, re.I))
        story.append(Paragraph(escape(text), styles["heading" if is_heading else "body"]))

    def footer(canvas, document):
        canvas.setFont("KnowledgeArial", 9)
        canvas.setFillColor(colors.HexColor("#555555"))
        canvas.drawCentredString(A4[0] / 2, 24, f"Trang {document.page} · Bản PDF tham chiếu knowledge base")

    document = SimpleDocTemplate(str(destination), pagesize=A4, rightMargin=46, leftMargin=46, topMargin=42, bottomMargin=46, title=source.stem, author="ProjectTT")
    document.build(story, onFirstPage=footer, onLaterPages=footer)


def main():
    REFERENCES.mkdir(exist_ok=True)
    CHUNKS.mkdir(exist_ok=True)
    manifest = {}
    for source in sorted(SOURCES.iterdir()):
        if source.suffix.lower() not in (".pdf", ".docx"):
            continue
        reference_edition = source.suffix.lower() == ".docx"
        pdf = REFERENCES / f"{source.stem}.pdf" if reference_edition else source
        if reference_edition:
            make_reference(source, pdf)
        reader = pymupdf.open(pdf)
        pages = []
        for number, page in enumerate(reader, 1):
            # Respect the PDF's clipping paths. Plain stream extraction also reads
            # obsolete fee tables hidden outside those paths in the source PDFs.
            text = page.get_text("text", flags=pymupdf.TEXTFLAGS_TEXT, sort=True)
            text = text.replace("\x00", "•")
            if not text.strip():
                raise RuntimeError(f"No extractable text in {pdf.name}, page {number}")
            pages.append(f"## {pdf.stem} — Trang {number}\n\n{text.strip()}\n")
        markdown = CHUNKS / f"{source.stem}.md"
        markdown.write_text("\n".join(pages), encoding="utf-8")
        manifest[markdown.name] = {
            "file": pdf.relative_to(ROOT).as_posix(),
            "original": source.relative_to(ROOT).as_posix(),
            "referenceEdition": reference_edition,
            "pages": len(reader),
            "sourceSha256": digest(source),
            "referenceSha256": digest(pdf),
            "markdownSha256": digest(markdown),
        }
        print(json.dumps({"document": source.name, "pages": len(reader), "referenceEdition": reference_edition}))
    (ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
