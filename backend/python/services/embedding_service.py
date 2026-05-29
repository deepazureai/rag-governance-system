"""
Embedding Service Module

Creates embeddings using Azure OpenAI with proper parameter configuration.
Handles batch processing and logging.
"""

import logging
from typing import List, Optional
from openai import AzureOpenAI

from config.azure_config import AzureOpenAIConfig
from services.logging_service import LoggingService


logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Service for creating embeddings via Azure OpenAI.
    
    Processes documents in batches to create embeddings.
    Uses exact Azure OpenAI parameter names from config.
    """
    
    BATCH_SIZE = 32  # Process embeddings in batches of 32
    
    def __init__(self, config: AzureOpenAIConfig, logging_service: Optional[LoggingService] = None):
        """
        Initialize embedding service.
        
        Args:
            config: AzureOpenAIConfig with exact parameter names
            logging_service: Optional logging service instance
        """
        self.config = config
        self.logging_service = logging_service or LoggingService()
        
        # Validate config before creating client
        self.config.validate()
        
        # Create Azure OpenAI client with exact parameters
        self.client = self._create_client()
        self.deployment_name = config.deployment
    
    def _create_client(self) -> AzureOpenAI:
        """
        Create Azure OpenAI client with exact parameter names.
        
        Returns:
            AzureOpenAI: Configured client instance
        
        Raises:
            ValueError: If config validation fails
        """
        try:
            # Get exact parameter dict from config
            params = self.config.to_client_params()
            
            # Create client with exact parameter names
            client = AzureOpenAI(**params)
            
            self.logging_service.log_info(
                'EmbeddingService',
                f'Azure OpenAI client initialized for deployment: {self.deployment_name}',
                {'skip_ssl_verification': self.config.skip_ssl_verification}
            )
            
            return client
        except Exception as error:
            error_msg = str(error)
            self.logging_service.log_error(
                'EmbeddingService',
                f'Failed to create Azure OpenAI client: {error_msg}',
                {'config': {'deployment': self.deployment_name}}
            )
            raise
    
    def create_embedding(self, text: str) -> Optional[List[float]]:
        """
        Create embedding for a single text.
        
        Args:
            text: Text to embed
        
        Returns:
            List of floats representing the embedding, or None if failed
        """
        try:
            response = self.client.embeddings.create(
                input=text,
                model=self.deployment_name
            )
            
            if response.data and len(response.data) > 0:
                embedding = response.data[0].embedding
                self.logging_service.log_debug(
                    'EmbeddingService',
                    f'Created embedding (length: {len(embedding)})'
                )
                return embedding
            
            return None
        except Exception as error:
            error_msg = str(error)
            self.logging_service.log_error(
                'EmbeddingService',
                f'Failed to create embedding: {error_msg}',
                {'text_length': len(text)}
            )
            return None
    
    def create_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Create embeddings for multiple texts in batches.
        
        Args:
            texts: List of texts to embed
        
        Returns:
            List of embeddings (or None for failed items)
        """
        embeddings = []
        
        try:
            # Process in batches of BATCH_SIZE
            for i in range(0, len(texts), self.BATCH_SIZE):
                batch = texts[i:i + self.BATCH_SIZE]
                
                try:
                    response = self.client.embeddings.create(
                        input=batch,
                        model=self.deployment_name
                    )
                    
                    # Sort by index to maintain order
                    sorted_data = sorted(response.data, key=lambda x: x.index)
                    
                    for item in sorted_data:
                        embeddings.append(item.embedding)
                    
                    self.logging_service.log_info(
                        'EmbeddingService',
                        f'Created batch embeddings (batch_size: {len(batch)})',
                        {'batch_num': i // self.BATCH_SIZE + 1}
                    )
                
                except Exception as batch_error:
                    error_msg = str(batch_error)
                    self.logging_service.log_error(
                        'EmbeddingService',
                        f'Failed to create batch embeddings: {error_msg}',
                        {'batch_start': i, 'batch_size': len(batch)}
                    )
                    # Add None for failed items in this batch
                    embeddings.extend([None] * len(batch))
            
            return embeddings
        
        except Exception as error:
            error_msg = str(error)
            self.logging_service.log_error(
                'EmbeddingService',
                f'Failed to create embeddings batch: {error_msg}',
                {'total_texts': len(texts)}
            )
            return [None] * len(texts)
