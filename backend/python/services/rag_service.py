"""
RAG Service Module

Orchestrates the complete RAG (Retrieval-Augmented Generation) pipeline:
1. Document retrieval from vector store
2. Context ranking and selection
3. LLM response generation
"""

from typing import List, Dict, Optional, Tuple
import logging

from openai import AzureOpenAI
from config.azure_config import AzureOpenAIConfig
from services.logging_service import LoggingService
from services.vector_store import VectorStore


logger = logging.getLogger(__name__)


class RAGService:
    """
    Orchestrates the RAG pipeline for knowledge base queries.
    
    Flow:
    1. Retrieve relevant documents from vector store (hybrid search)
    2. Rank and filter contexts based on relevance
    3. Build prompt with selected contexts
    4. Call Azure OpenAI LLM to generate response
    5. Return response with retrieval metadata
    """
    
    def __init__(
        self,
        llm_config: AzureOpenAIConfig,
        vector_store: VectorStore,
        logging_service: Optional[LoggingService] = None
    ):
        """
        Initialize RAG service.
        
        Args:
            llm_config: Azure OpenAI configuration
            vector_store: Vector store instance for retrieval
            logging_service: Optional logging service
        """
        self.llm_config = llm_config
        self.vector_store = vector_store
        self.logging_service = logging_service or LoggingService()
        
        # Validate and create LLM client
        self.llm_config.validate()
        self.llm_client = self._create_llm_client()
        
        self.logging_service.log_info(
            'RAGService',
            'RAG service initialized',
            {'deployment': llm_config.deployment}
        )
    
    def _create_llm_client(self) -> AzureOpenAI:
        """
        Create Azure OpenAI LLM client with exact parameters.
        
        Returns:
            AzureOpenAI: Configured client
        """
        try:
            params = self.llm_config.to_client_params()
            client = AzureOpenAI(**params)
            
            self.logging_service.log_info(
                'RAGService._create_llm_client',
                'Azure OpenAI LLM client created',
                {
                    'deployment': self.llm_config.deployment,
                    'skip_ssl': self.llm_config.skip_ssl_verification
                }
            )
            
            return client
        except Exception as error:
            error_msg = f'Failed to create LLM client: {str(error)}'
            self.logging_service.log_error(
                'RAGService._create_llm_client',
                error_msg
            )
            raise
    
    async def generate_response(
        self,
        query: str,
        query_embeddings: Optional[List[float]] = None,
        top_k: int = 5,
        use_hybrid_search: bool = True,
        use_mmr: bool = True,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000
    ) -> Tuple[Dict, Optional[str]]:
        """
        Generate response using RAG pipeline.
        
        Args:
            query: User query
            query_embeddings: Pre-computed query embeddings (optional)
            top_k: Number of context documents to retrieve
            use_hybrid_search: Use hybrid (vector + BM25) search
            use_mmr: Apply MMR re-ranking
            system_prompt: Custom system prompt for LLM
            temperature: LLM temperature (0-2)
            max_tokens: Maximum tokens in response
        
        Returns:
            Tuple of (response_dict, error_message)
            Response format: {
                'response': str,
                'contexts': List[str],
                'metadata': {
                    'retrieval_count': int,
                    'retrieval_time': float,
                    'generation_time': float,
                    'model': str,
                    'tokens_used': int
                }
            }
        """
        try:
            if not query or not query.strip():
                error_msg = 'Query cannot be empty'
                self.logging_service.log_error(
                    'RAGService.generate_response',
                    error_msg
                )
                return {}, error_msg
            
            # Step 1: Retrieve relevant contexts from vector store
            contexts, retrieval_error = await self._retrieve_contexts(
                query,
                query_embeddings,
                top_k,
                use_hybrid_search,
                use_mmr
            )
            
            if retrieval_error:
                self.logging_service.log_warning(
                    'RAGService.generate_response',
                    f'Retrieval warning: {retrieval_error}'
                )
            
            # Step 2: Rank and filter contexts
            ranked_contexts = self._rank_contexts(contexts)
            
            # Step 3: Build prompt with contexts
            prompt = self._build_prompt(query, ranked_contexts, system_prompt)
            
            # Step 4: Generate response using LLM
            response_dict, generation_error = await self._call_llm(
                prompt,
                temperature,
                max_tokens
            )
            
            if generation_error:
                return {}, generation_error
            
            # Step 5: Add retrieval metadata
            response_dict['contexts'] = [c['document'] for c in ranked_contexts[:top_k]]
            response_dict['metadata']['retrieval_count'] = len(ranked_contexts)
            
            self.logging_service.log_info(
                'RAGService.generate_response',
                'Response generated successfully',
                {
                    'query_length': len(query),
                    'context_count': len(ranked_contexts),
                    'response_length': len(response_dict.get('response', ''))
                }
            )
            
            return response_dict, None
        
        except Exception as error:
            error_msg = f'RAG generation failed: {str(error)}'
            self.logging_service.log_error(
                'RAGService.generate_response',
                error_msg,
                {'error_type': type(error).__name__, 'query_length': len(query)}
            )
            return {}, error_msg
    
    async def _retrieve_contexts(
        self,
        query: str,
        embeddings: Optional[List[float]],
        top_k: int,
        use_hybrid: bool,
        use_mmr: bool
    ) -> Tuple[List[Dict], Optional[str]]:
        """
        Retrieve contexts from vector store.
        
        Returns:
            Tuple of (contexts, error_message)
        """
        try:
            if use_hybrid:
                contexts, error = self.vector_store.hybrid_search(
                    query=query,
                    embeddings=embeddings,
                    top_k=top_k * 2,  # Get more for MMR filtering
                    use_mmr=use_mmr
                )
            else:
                contexts, error = self.vector_store.vector_search(
                    embeddings=embeddings,
                    top_k=top_k
                )
            
            return contexts[:top_k], error
        
        except Exception as error:
            error_msg = f'Context retrieval failed: {str(error)}'
            self.logging_service.log_error(
                'RAGService._retrieve_contexts',
                error_msg
            )
            return [], error_msg
    
    def _rank_contexts(self, contexts: List[Dict]) -> List[Dict]:
        """
        Rank contexts by relevance and diversity.
        
        Returns:
            Ranked contexts list
        """
        try:
            # Sort by relevance score (higher is better)
            ranked = sorted(
                contexts,
                key=lambda x: x.get('score', 0),
                reverse=True
            )
            
            self.logging_service.log_debug(
                'RAGService._rank_contexts',
                f'Ranked {len(ranked)} contexts'
            )
            
            return ranked
        
        except Exception as error:
            self.logging_service.log_error(
                'RAGService._rank_contexts',
                f'Ranking failed: {str(error)}'
            )
            return contexts
    
    def _build_prompt(
        self,
        query: str,
        contexts: List[Dict],
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Build LLM prompt with query and retrieved contexts.
        
        Returns:
            Formatted prompt string
        """
        context_text = '\n\n'.join([
            f'Context {i+1}:\n{c.get("document", "")}' 
            for i, c in enumerate(contexts[:5])
        ])
        
        default_system = """You are a helpful AI assistant that answers questions based on provided context.
Always cite the context when providing information.
If the context doesn't contain relevant information, say so clearly."""
        
        system = system_prompt or default_system
        
        prompt = f"""{system}

Context Information:
{context_text}

User Question: {query}

Answer:"""
        
        return prompt
    
    async def _call_llm(
        self,
        prompt: str,
        temperature: float,
        max_tokens: int
    ) -> Tuple[Dict, Optional[str]]:
        """
        Call Azure OpenAI LLM to generate response.
        
        Returns:
            Tuple of (response_dict, error_message)
        """
        try:
            response = self.llm_client.chat.completions.create(
                model=self.llm_config.deployment,
                messages=[
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            response_dict = {
                'response': response.choices[0].message.content,
                'metadata': {
                    'model': self.llm_config.deployment,
                    'tokens_used': response.usage.total_tokens if response.usage else 0
                }
            }
            
            self.logging_service.log_debug(
                'RAGService._call_llm',
                'LLM response generated',
                {'tokens': response_dict['metadata']['tokens_used']}
            )
            
            return response_dict, None
        
        except Exception as error:
            error_msg = f'LLM call failed: {str(error)}'
            self.logging_service.log_error(
                'RAGService._call_llm',
                error_msg,
                {'error_type': type(error).__name__}
            )
            return {}, error_msg
