import pdfplumber
import pytesseract
import json
import os
from PIL import Image
import re
import unicodedata

def clean_ocr_text(text):
    text = unicodedata.normalize("NFC", text)  # chuẩn hóa Unicode
    text = re.sub(r'[^\w\s.,:;!?%–\-…]', '', text)  # bỏ ký tự rác
    text = re.sub(r'\s{2,}', ' ', text)  # bỏ khoảng trắng dư
    return text.strip()

# Cấu hình pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_pdf(pdf_path):
    """Trích xuất text từ PDF bao gồm cả bảng và OCR"""
    extracted_content = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # Trích xuất text thường
            text = page.extract_text() or ""
            
            # Trích xuất bảng
            tables = page.extract_tables()
            tables_text = []
            for table in tables:
                table_rows = []
                for row in table:
                    # Lọc các cell None và chuẩn hóa
                    cleaned_row = [str(cell).strip() if cell else "" for cell in row]
                    table_rows.append(" | ".join(cleaned_row))
                tables_text.append("\n".join(table_rows))
            
            # OCR toàn trang dưới dạng ảnh
            ocr_texts = []
            if not text.strip():
                try:
                    pil_image = page.to_image(resolution=400).original.convert("L")
                    ocr_text = clean_ocr_text(pytesseract.image_to_string(pil_image, lang='vie+eng'))
                    if ocr_text.strip():
                        ocr_texts.append(ocr_text.strip())
                except Exception as e:
                    print(f"OCR error for page in {pdf_path}: {e}")
                        
            # Gộp các phần text
            page_content = "\n\n".join(filter(None, [
                text,
                *tables_text,
                *ocr_texts
            ]))
            
            if page_content.strip():
                extracted_content.append(page_content)
    
    return "\n\n".join(extracted_content)

def chunk_text(text, min_words=100, max_words=150):
    """Chia text thành các chunk với kích thước phù hợp"""
    # Tách câu dựa trên dấu chấm, chấm hỏi, chấm than
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = []
    word_count = 0
    
    for sentence in sentences:
        words = sentence.split()
        current_chunk.append(sentence)
        word_count += len(words)
        
        if word_count >= min_words:
            chunks.append(' '.join(current_chunk))
            current_chunk = []
            word_count = 0
    
    # Thêm phần còn lại
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def process_pdf_directory(pdf_dir, output_dir):
    """Xử lý tất cả file PDF trong thư mục"""
    os.makedirs(output_dir, exist_ok=True)
    
    for filename in os.listdir(pdf_dir):
        if not filename.endswith('.pdf'):
            continue
            
        pdf_path = os.path.join(pdf_dir, filename)
        print(f"\n📑 Processing PDF: {filename}")
        
        try:
            # Trích xuất text
            extracted_text = extract_text_from_pdf(pdf_path)
            
            # Chia thành chunks
            chunks = chunk_text(extracted_text)
            print(f"🔄 Created {len(chunks)} chunks")
            
            # Lưu chunks vào file JSON
            output_file = os.path.join(
                output_dir, 
                f"{os.path.splitext(filename)[0]}_chunks.json"
            )
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'filename': filename,
                    'chunks': chunks
                }, f, ensure_ascii=False, indent=2)
                
            print(f"✅ Saved chunks to {output_file}")
            
        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

if __name__ == "__main__":
    PDF_DIR = "C:/Code/ProjCT/knowledgeBase/pdf"
    OUTPUT_DIR = "C:/Code/ProjCT/knowledgeBase/chunks"
    
    process_pdf_directory(PDF_DIR, OUTPUT_DIR)