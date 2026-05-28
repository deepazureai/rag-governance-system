"""
Evaluation Reasoning & Improvement Suggestions Engine

This module generates detailed reasoning for low-scoring metrics and provides
actionable suggestions to improve prompt, context, or response quality.
"""

import os
import json
from typing import Dict, List, Optional, Any
from enum import Enum

try:
    from openai import AsyncOpenAI, OpenAI
except ImportError:
    AsyncOpenAI = None
    OpenAI = None

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

LLM_PROVIDER = os.getenv("EVALUATION_LLM_PROVIDER", "openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
AZURE_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

class ImprovementCategory(str, Enum):
    PROMPT_REWRITE = "prompt_rewrite"
    CONTEXT_SELECTION = "context_selection"
    RESPONSE_GENERATION = "response_generation"
    GENERAL = "general"

class ImprovementSuggestion:
    def __init__(self, metric: str, score: float, category: ImprovementCategory,
                 problem: str, suggestion: str, expected_improvement: float):
        self.metric = metric
        self.score = score
        self.category = category
        self.problem = problem
        self.suggestion = suggestion
        self.expected_improvement = expected_improvement  # Expected score increase

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric": self.metric,
            "current_score": self.score,
            "category": self.category.value,
            "problem": self.problem,
            "suggestion": self.suggestion,
            "expected_improvement": self.expected_improvement
        }

class ReasoningEngine:
    """Generates detailed reasoning and improvement suggestions for evaluations"""

    def __init__(self):
        self.openai_client = None
        self.claude_client = None
        
        if LLM_PROVIDER == "openai" and OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=OPENAI_API_KEY)
        elif LLM_PROVIDER == "azure" and AZURE_API_KEY and AZURE_ENDPOINT:
            self.openai_client = OpenAI(
                api_key=AZURE_API_KEY,
                base_url=f"{AZURE_ENDPOINT}/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15"
            )
        elif LLM_PROVIDER == "claude" and CLAUDE_API_KEY:
            self.claude_client = Anthropic(api_key=CLAUDE_API_KEY)

    def generate_faithfulness_improvement(self, user_prompt: str, context: str,
                                         llm_response: str, score: float) -> List[ImprovementSuggestion]:
        """Generate improvements for low faithfulness scores"""
        suggestions = []

        if score < 0.5:
            prompt = f"""The LLM response has low faithfulness to the provided context (score: {score}).
            
User Prompt: {user_prompt}

Context:
{context}

LLM Response:
{llm_response}

Provide 2-3 specific suggestions to improve faithfulness. Each suggestion should:
1. Identify what's not grounded in the context
2. Suggest how to modify the response or context
3. Estimate the score improvement (0.0 to 0.3)

Format as JSON array of objects with keys: problem, suggestion, expected_improvement"""

            try:
                if self.openai_client:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.5,
                        max_tokens=500
                    )
                    result_text = response.choices[0].message.content
                elif self.claude_client:
                    response = self.claude_client.messages.create(
                        model="claude-opus",
                        max_tokens=500,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    result_text = response.content[0].text
                else:
                    return suggestions

                result_json = json.loads(result_text)
                for item in result_json:
                    suggestions.append(ImprovementSuggestion(
                        metric="faithfulness",
                        score=score,
                        category=ImprovementCategory.RESPONSE_GENERATION,
                        problem=item.get("problem", ""),
                        suggestion=item.get("suggestion", ""),
                        expected_improvement=float(item.get("expected_improvement", 0.1))
                    ))
            except Exception as e:
                print(f"Error generating faithfulness improvements: {str(e)}")

        return suggestions

    def generate_relevancy_improvement(self, user_prompt: str, llm_response: str,
                                     score: float) -> List[ImprovementSuggestion]:
        """Generate improvements for low answer relevancy scores"""
        suggestions = []

        if score < 0.6:
            prompt = f"""The LLM response has low relevancy to the user's prompt (score: {score}).

User Prompt: {user_prompt}

LLM Response:
{llm_response}

Provide 2-3 specific suggestions to improve relevancy. Focus on:
1. Identifying parts of the response that don't address the prompt
2. Suggesting how the prompt could be clearer
3. Suggesting how the response should be refocused
4. Estimate the score improvement (0.0 to 0.3)

Format as JSON array of objects with keys: problem, suggestion, expected_improvement"""

            try:
                if self.openai_client:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.5,
                        max_tokens=500
                    )
                    result_text = response.choices[0].message.content
                elif self.claude_client:
                    response = self.claude_client.messages.create(
                        model="claude-opus",
                        max_tokens=500,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    result_text = response.content[0].text
                else:
                    return suggestions

                result_json = json.loads(result_text)
                for item in result_json:
                    suggestions.append(ImprovementSuggestion(
                        metric="answer_relevancy",
                        score=score,
                        category=ImprovementCategory.PROMPT_REWRITE,
                        problem=item.get("problem", ""),
                        suggestion=item.get("suggestion", ""),
                        expected_improvement=float(item.get("expected_improvement", 0.1))
                    ))
            except Exception as e:
                print(f"Error generating relevancy improvements: {str(e)}")

        return suggestions

    def generate_context_improvement(self, user_prompt: str, context: str,
                                    score: float) -> List[ImprovementSuggestion]:
        """Generate improvements for low contextual relevancy scores"""
        suggestions = []

        if score < 0.7:
            prompt = f"""The retrieved context has low relevancy to the user's prompt (score: {score}).

User Prompt: {user_prompt}

Context:
{context}

Provide 2-3 specific suggestions to improve context relevancy:
1. Identify what topics are missing from the context
2. Suggest what types of documents should be retrieved
3. Suggest how to modify the retrieval query
4. Estimate the score improvement (0.0 to 0.3)

Format as JSON array of objects with keys: problem, suggestion, expected_improvement"""

            try:
                if self.openai_client:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.5,
                        max_tokens=500
                    )
                    result_text = response.choices[0].message.content
                elif self.claude_client:
                    response = self.claude_client.messages.create(
                        model="claude-opus",
                        max_tokens=500,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    result_text = response.content[0].text
                else:
                    return suggestions

                result_json = json.loads(result_text)
                for item in result_json:
                    suggestions.append(ImprovementSuggestion(
                        metric="contextual_relevancy",
                        score=score,
                        category=ImprovementCategory.CONTEXT_SELECTION,
                        problem=item.get("problem", ""),
                        suggestion=item.get("suggestion", ""),
                        expected_improvement=float(item.get("expected_improvement", 0.1))
                    ))
            except Exception as e:
                print(f"Error generating context improvements: {str(e)}")

        return suggestions

    def generate_toxicity_improvement(self, llm_response: str, score: float) -> List[ImprovementSuggestion]:
        """Generate improvements for high toxicity scores"""
        suggestions = []

        if score > 0.3:  # High toxicity
            prompt = f"""The LLM response contains toxic or harmful content (toxicity score: {score}).

Response:
{llm_response}

Provide 2-3 specific suggestions to make the response less toxic:
1. Identify specific toxic/harmful passages
2. Suggest how to rephrase with positive language
3. Suggest system prompt changes to prevent this
4. Estimate the score improvement (0.0 to 0.3, where lower is better)

Format as JSON array of objects with keys: problem, suggestion, expected_improvement"""

            try:
                if self.openai_client:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.5,
                        max_tokens=500
                    )
                    result_text = response.choices[0].message.content
                elif self.claude_client:
                    response = self.claude_client.messages.create(
                        model="claude-opus",
                        max_tokens=500,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    result_text = response.content[0].text
                else:
                    return suggestions

                result_json = json.loads(result_text)
                for item in result_json:
                    suggestions.append(ImprovementSuggestion(
                        metric="toxicity_score",
                        score=score,
                        category=ImprovementCategory.RESPONSE_GENERATION,
                        problem=item.get("problem", ""),
                        suggestion=item.get("suggestion", ""),
                        expected_improvement=float(item.get("expected_improvement", 0.1))
                    ))
            except Exception as e:
                print(f"Error generating toxicity improvements: {str(e)}")

        return suggestions

    def generate_bias_improvement(self, user_prompt: str, llm_response: str,
                                 score: float) -> List[ImprovementSuggestion]:
        """Generate improvements for high bias scores"""
        suggestions = []

        if score > 0.3:  # Significant bias
            prompt = f"""The LLM response contains bias (bias score: {score}).

Prompt: {user_prompt}

Response:
{llm_response}

Provide 2-3 specific suggestions to reduce bias:
1. Identify biased language or assumptions
2. Suggest how to include multiple perspectives
3. Suggest neutral rephrasing
4. Estimate the score improvement (0.0 to 0.3, where lower is better)

Format as JSON array of objects with keys: problem, suggestion, expected_improvement"""

            try:
                if self.openai_client:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.5,
                        max_tokens=500
                    )
                    result_text = response.choices[0].message.content
                elif self.claude_client:
                    response = self.claude_client.messages.create(
                        model="claude-opus",
                        max_tokens=500,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    result_text = response.content[0].text
                else:
                    return suggestions

                result_json = json.loads(result_text)
                for item in result_json:
                    suggestions.append(ImprovementSuggestion(
                        metric="bias_score",
                        score=score,
                        category=ImprovementCategory.RESPONSE_GENERATION,
                        problem=item.get("problem", ""),
                        suggestion=item.get("suggestion", ""),
                        expected_improvement=float(item.get("expected_improvement", 0.1))
                    ))
            except Exception as e:
                print(f"Error generating bias improvements: {str(e)}")

        return suggestions

    def generate_all_improvements(self, user_prompt: str, context: str,
                                 llm_response: str, scores: Dict[str, float]) -> Dict[str, List[Dict[str, Any]]]:
        """Generate improvements for all low-scoring metrics"""
        improvements_by_metric = {}

        # Faithfulness
        if scores.get("faithfulness", 1.0) < 0.75:
            improvements_by_metric["faithfulness"] = [
                s.to_dict() for s in self.generate_faithfulness_improvement(
                    user_prompt, context, llm_response, scores.get("faithfulness", 0)
                )
            ]

        # Answer Relevancy
        if scores.get("answer_relevancy", 1.0) < 0.75:
            improvements_by_metric["answer_relevancy"] = [
                s.to_dict() for s in self.generate_relevancy_improvement(
                    user_prompt, llm_response, scores.get("answer_relevancy", 0)
                )
            ]

        # Contextual Relevancy
        if scores.get("contextual_relevancy", 1.0) < 0.75:
            improvements_by_metric["contextual_relevancy"] = [
                s.to_dict() for s in self.generate_context_improvement(
                    user_prompt, context, scores.get("contextual_relevancy", 0)
                )
            ]

        # Toxicity
        if scores.get("toxicity_score", 0.0) > 0.25:
            improvements_by_metric["toxicity_score"] = [
                s.to_dict() for s in self.generate_toxicity_improvement(
                    llm_response, scores.get("toxicity_score", 0)
                )
            ]

        # Bias
        if scores.get("bias_score", 0.0) > 0.25:
            improvements_by_metric["bias_score"] = [
                s.to_dict() for s in self.generate_bias_improvement(
                    user_prompt, llm_response, scores.get("bias_score", 0)
                )
            ]

        return improvements_by_metric


# Global instance
reasoning_engine = ReasoningEngine()
