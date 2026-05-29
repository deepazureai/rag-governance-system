"""
Logging Service Module

Centralized logging for all KB services.
Provides structured logging with context.
"""

import logging
import sys
from datetime import datetime
from typing import Any, Optional, Dict


class LoggingService:
    """
    Centralized logging service for KB operations.
    
    Provides structured logging with context, timestamps, and service names.
    """
    
    def __init__(self, service_name: str = 'RAG-KB', level: str = 'INFO'):
        """
        Initialize logging service.
        
        Args:
            service_name: Name of the service for log identification
            level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        
        # Set logging level
        log_level = getattr(logging, level.upper(), logging.INFO)
        self.logger.setLevel(log_level)
        
        # Remove any existing handlers to avoid duplicates
        self.logger.handlers = []
        
        # Create console handler with formatter
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        
        # Create formatter
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        
        self.logger.addHandler(handler)
    
    def log_debug(
        self,
        component: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log debug message with context."""
        log_msg = self._format_message(component, message, context)
        self.logger.debug(log_msg)
    
    def log_info(
        self,
        component: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log info message with context."""
        log_msg = self._format_message(component, message, context)
        self.logger.info(log_msg)
    
    def log_warning(
        self,
        component: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log warning message with context."""
        log_msg = self._format_message(component, message, context)
        self.logger.warning(log_msg)
    
    def log_error(
        self,
        component: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log error message with context."""
        log_msg = self._format_message(component, message, context)
        self.logger.error(log_msg)
    
    def log_critical(
        self,
        component: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log critical message with context."""
        log_msg = self._format_message(component, message, context)
        self.logger.critical(log_msg)
    
    @staticmethod
    def _format_message(
        component: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Format log message with component and context.
        
        Args:
            component: Component/module name
            message: Main message
            context: Additional context dictionary
        
        Returns:
            Formatted log message
        """
        parts = [f'[{component}]', message]
        
        if context:
            context_str = ' | '.join(
                f'{k}={v}' for k, v in context.items()
            )
            parts.append(f'({context_str})')
        
        return ' '.join(parts)
