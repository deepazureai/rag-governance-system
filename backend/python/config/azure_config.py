"""
Azure OpenAI Configuration Module

Handles configuration and connection parameters for Azure OpenAI service.
Ensures exact parameter names required by Azure OpenAI Python SDK.
"""

from dataclasses import dataclass
from typing import Optional
import httpx


@dataclass
class AzureOpenAIConfig:
    """
    Azure OpenAI configuration with exact parameter names.
    
    These exact names are required by the Azure OpenAI Python SDK:
    - api_key: Azure OpenAI resource API key
    - azure_endpoint: Azure OpenAI resource endpoint URL
    - api_version: Azure API version (e.g., "2024-02-15-preview")
    - deployment: Deployment name in Azure (e.g., "gpt-4-deployment")
    """
    
    api_key: str
    azure_endpoint: str
    api_version: str
    deployment: str
    skip_ssl_verification: bool = False
    
    def validate(self) -> None:
        """Validate all required fields are present and non-empty."""
        if not self.api_key or not self.api_key.strip():
            raise ValueError("api_key is required and cannot be empty")
        if not self.azure_endpoint or not self.azure_endpoint.strip():
            raise ValueError("azure_endpoint is required and cannot be empty")
        if not self.api_version or not self.api_version.strip():
            raise ValueError("api_version is required and cannot be empty")
        if not self.deployment or not self.deployment.strip():
            raise ValueError("deployment is required and cannot be empty")
    
    def get_http_client(self) -> Optional[httpx.Client]:
        """
        Returns configured HTTP client with SSL verification setting.
        
        Significance of skip_ssl_verification:
        - When True: Disables SSL/TLS certificate verification
        - Use Case: Corporate proxies, self-signed certificates, development environments
        - Security Risk: Can expose to man-in-the-middle attacks in production
        - Recommendation: Default False (verify certificates) in production
        
        Returns:
            httpx.Client with verify=False if skip_ssl_verification=True
            None if skip_ssl_verification=False (use default SSL verification)
        """
        if self.skip_ssl_verification:
            # Disable SSL verification for corporate proxy/self-signed certs
            return httpx.Client(verify=False)
        return None  # Use default SSL verification
    
    def to_client_params(self) -> dict:
        """
        Returns exact Azure OpenAI parameter names required for connection.
        
        These are the EXACT parameter names required by Azure OpenAI SDK.
        Verify parameter names match Azure SDK documentation.
        
        Returns:
            dict: Parameters for AzureOpenAI client instantiation
        """
        return {
            'api_key': self.api_key,
            'azure_endpoint': self.azure_endpoint,
            'api_version': self.api_version,
            'http_client': self.get_http_client()
        }
    
    def to_dict(self) -> dict:
        """Return config as dictionary for serialization."""
        return {
            'api_key': self.api_key,
            'azure_endpoint': self.azure_endpoint,
            'api_version': self.api_version,
            'deployment': self.deployment,
            'skip_ssl_verification': self.skip_ssl_verification,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'AzureOpenAIConfig':
        """Create config from dictionary."""
        return cls(
            api_key=data.get('api_key', ''),
            azure_endpoint=data.get('azure_endpoint', ''),
            api_version=data.get('api_version', ''),
            deployment=data.get('deployment', ''),
            skip_ssl_verification=data.get('skip_ssl_verification', False),
        )
