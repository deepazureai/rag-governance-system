"""
Document Processor Module

Extracts text from various document formats and chunks them for embedding.
Supports: PDF, Excel, DOCX, TXT, CSV, XLSX, PPTX
"""

import os
from typing import List, Optional, Tuple
from pathlib import Path
import logging

from services.logging_service import LoggingService


logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    Service for processing documents and creating text chunks.
    
    Supports multiple document formats and uses RecursiveCharacterTextSplitter
    for intelligent text chunking based on separators.
    """
    
    # Supported document extensions
    SUPPORTED_FORMATS = {
        '.pdf': 'PDF',
        '.xlsx': 'Excel',
        '.xls': 'Excel',
        '.docx': 'Word Document',
        '.doc': 'Word Document',
        '.txt': 'Text File',
        '.csv': 'CSV',
        '.pptx': 'PowerPoint',
        '.ppt': 'PowerPoint',
    }
    
    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        logging_service: Optional[LoggingService] = None
    ):
        """
        Initialize document processor.
        
        Args:
            chunk_size: Size of each chunk in characters
            chunk_overlap: Overlap between chunks in characters
            logging_service: Optional logging service instance
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.logging_service = logging_service or LoggingService()
    
    def process_document(self, file_path: str) -> Tuple[List[str], Optional[str]]:
        """
        Process a document and return text chunks.
        
        Args:
            file_path: Path to the document file
        
        Returns:
            Tuple of (chunks, error_message)
            - chunks: List of text chunks, or empty list if failed
            - error_message: Error message if processing failed, None if successful
        """
        try:
            if not os.path.exists(file_path):
                error_msg = f'File not found: {file_path}'
                self.logging_service.log_error(
                    'DocumentProcessor',
                    error_msg,
                    {'file_path': file_path}
                )
                return [], error_msg
            
            # Get file extension
            _, ext = os.path.splitext(file_path)
            ext = ext.lower()
            
            if ext not in self.SUPPORTED_FORMATS:
                error_msg = f'Unsupported file format: {ext}. Supported: {list(self.SUPPORTED_FORMATS.keys())}'
                self.logging_service.log_error(
                    'DocumentProcessor',
                    error_msg,
                    {'file_path': file_path, 'extension': ext}
                )
                return [], error_msg
            
            # Extract text based on format
            text = self._extract_text(file_path, ext)
            
            if not text:
                error_msg = f'No text extracted from: {file_path}'
                self.logging_service.log_warning(
                    'DocumentProcessor',
                    error_msg,
                    {'file_path': file_path}
                )
                return [], None  # Not an error, just no content
            
            # Create chunks
            chunks = self._chunk_text(text)
            
            self.logging_service.log_info(
                'DocumentProcessor',
                f'Successfully processed document: {os.path.basename(file_path)}',
                {
                    'file_path': file_path,
                    'format': self.SUPPORTED_FORMATS.get(ext, 'Unknown'),
                    'text_length': len(text),
                    'chunks_count': len(chunks)
                }
            )
            
            return chunks, None
        
        except Exception as error:
            error_msg = f'Failed to process document: {str(error)}'
            self.logging_service.log_error(
                'DocumentProcessor',
                error_msg,
                {'file_path': file_path, 'error_type': type(error).__name__}
            )
            return [], error_msg
    
    def _extract_text(self, file_path: str, ext: str) -> str:
        """
        Extract text from document based on format.
        
        Args:
            file_path: Path to the file
            ext: File extension (lowercase)
        
        Returns:
            Extracted text
        """
        try:
            if ext == '.txt':
                return self._extract_text_file(file_path)
            elif ext == '.csv':
                return self._extract_csv(file_path)
            elif ext in ['.xlsx', '.xls']:
                return self._extract_excel(file_path)
            elif ext in ['.docx', '.doc']:
                return self._extract_docx(file_path)
            elif ext == '.pdf':
                return self._extract_pdf(file_path)
            elif ext in ['.pptx', '.ppt']:
                return self._extract_pptx(file_path)
            else:
                raise ValueError(f'Unsupported format: {ext}')
        
        except Exception as error:
            self.logging_service.log_error(
                'DocumentProcessor._extract_text',
                f'Failed to extract text: {str(error)}',
                {'file_path': file_path, 'extension': ext}
            )
            raise
    
    def _extract_text_file(self, file_path: str) -> str:
        """Extract text from plain text file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _extract_csv(self, file_path: str) -> str:
        """Extract text from CSV file."""
        # TODO: Implement CSV parsing with pandas or csv module
        # For now, return basic implementation
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _extract_excel(self, file_path: str) -> str:
        """Extract text from Excel file."""
        # TODO: Implement Excel parsing with openpyxl or pandas
        # Requires: pip install openpyxl pandas
        raise NotImplementedError('Excel extraction not yet implemented')
    
    def _extract_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        # TODO: Implement DOCX parsing with python-docx
        # Requires: pip install python-docx
        raise NotImplementedError('DOCX extraction not yet implemented')
    
    def _extract_pdf(self, file_path: str) -> str:
        """Extract text from PDF file."""
        # TODO: Implement PDF parsing with PyPDF2 or pdfplumber
        # Requires: pip install PyPDF2 or pdfplumber
        raise NotImplementedError('PDF extraction not yet implemented')
    
    def _extract_pptx(self, file_path: str) -> str:
        """Extract text from PowerPoint file."""
        # TODO: Implement PPTX parsing with python-pptx
        # Requires: pip install python-pptx
        raise NotImplementedError('PPTX extraction not yet implemented')
    
    def _chunk_text(self, text: str) -> List[str]:
        """
        Chunk text using RecursiveCharacterTextSplitter strategy.
        
        Splits on separators in order of preference:
        1. Double newlines (paragraph breaks)
        2. Single newlines (line breaks)
        3. Spaces
        4. Characters
        
        Args:
            text: Text to chunk
        
        Returns:
            List of text chunks
        """
        separators = ['\n\n', '\n', ' ', '']
        chunks = []
        
        def _split_text(text: str, separators: List[str]) -> List[str]:
            """Recursively split text on separators."""
            good_splits = []
            separator = separators[-1]
            
            for i, s in enumerate(separators):
                if s == '':
                    separator = s
                    break
                if s in text:
                    separator = s
                    break
            
            if separator:
                splits = text.split(separator)
            else:
                splits = list(text)
            
            good_splits = [s for s in splits if s]
            return good_splits
        
        splits = _split_text(text, separators)
        
        # Merge splits into chunks respecting chunk_size and overlap
        current_chunk = ''
        
        for split in splits:
            if len(current_chunk) + len(split) <= self.chunk_size:
                current_chunk += split + (separators[separators.index(separator)] if separator in separators else '')
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                
                # Start new chunk with overlap
                if len(split) > self.chunk_size:
                    # If single split is larger than chunk_size, recursively split it
                    current_chunk = split[-self.chunk_overlap:] if self.chunk_overlap < len(split) else split
                else:
                    current_chunk = split
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return [c.strip() for c in chunks if c.strip()]
