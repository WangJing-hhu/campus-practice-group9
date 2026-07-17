from pathlib import Path
from pypdf import PdfReader
from docx import Document as DocxDocument

class FileReader:
    @staticmethod
    def extract(file_path: str) -> str:
        path = Path(file_path)
        suffix = path.suffix.lower()

        if suffix == ".txt":
            return path.read_text(encoding="utf-8")
        elif suffix == ".pdf":
            reader = PdfReader(str(path))
            return "\n".join(
                page.extract_text() or "" for page in reader.pages
            )
        elif suffix == ".docx":
            doc = DocxDocument(str(path))
            return "\n".join(p.text for p in doc.paragraphs)
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")

file_reader = FileReader()