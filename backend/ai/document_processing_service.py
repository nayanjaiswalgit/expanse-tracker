from typing import Dict, Any

# Import libraries for document processing
# PDF
import PyPDF2
from pdf2image import convert_from_path

# Image (OCR)
import pytesseract
from PIL import Image

# DOCX
from docx import Document as DocxDocument  # Will need to install python-docx

# Excel
import pandas as pd  # Already in requirements.txt


class DocumentProcessingService:
    def __init__(self):
        # Configure pytesseract path if needed (e.g., for Windows)
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        pass

    def process_pdf(self, file_path: str) -> str:
        """Extracts text from a PDF file."""
        text = ""
        try:
            with open(file_path, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                for page_num in range(len(reader.pages)):
                    text += reader.pages[page_num].extract_text() + "\n"
        except Exception as e:
            print(f"Error processing PDF {file_path}: {e}")
            # Fallback to OCR for scanned PDFs
            try:
                images = convert_from_path(file_path)
                for i, image in enumerate(images):
                    text += pytesseract.image_to_string(image) + "\n"
            except Exception as ocr_e:
                print(f"Error OCR'ing PDF {file_path}: {ocr_e}")
                return ""
        return text

    def process_image(self, file_path: str) -> str:
        """Extracts text from an image file using OCR."""
        try:
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img)
            return text
        except Exception as e:
            print(f"Error processing image {file_path}: {e}")
            return ""

    def process_docx(self, file_path: str) -> str:
        """Extracts text from a DOCX file."""
        try:
            doc = DocxDocument(file_path)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            print(f"Error processing DOCX {file_path}: {e}")
            return ""

    def process_excel(self, file_path: str) -> Dict[str, Any]:
        """Extracts data from an Excel file (first sheet)."""
        try:
            df = pd.read_excel(file_path, engine="openpyxl")
            return df.to_dict(orient="records")
        except Exception as e:
            print(f"Error processing Excel {file_path}: {e}")
            return {{}}

    def process_document(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """Dispatches document processing based on file type."""
        file_type = file_type.lower()
        if file_type == "pdf":
            return {{"text_content": self.process_pdf(file_path)}}
        elif file_type in ["png", "jpg", "jpeg", "gif", "bmp", "tiff"]:
            return {{"text_content": self.process_image(file_path)}}
        elif file_type == "docx":
            return {{"text_content": self.process_docx(file_path)}}
        elif file_type in ["xlsx", "xls"]:
            return {{"table_data": self.process_excel(file_path)}}
        else:
            print(f"Unsupported file type: {file_type}")
            return {{"error": f"Unsupported file type: {file_type}"}}


# Global instance
document_processing_service = DocumentProcessingService()
