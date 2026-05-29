'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Prompt Evaluation Dashboard',
      description: 'This guide will help you understand how to use the platform effectively.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The dashboard helps you monitor, analyze, and improve LLM prompt performance across three evaluation frameworks.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              Key concepts: Upload evaluation data, review metrics, analyze low scores, search knowledge base, and manage templates.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 1: Upload Your Data',
      description: 'Start by uploading evaluation results',
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-2">Raw Data Tab</h4>
            <p className="text-sm text-purple-800">
              Upload CSV or JSON files containing evaluation results from your LLM prompts. The system will validate and process the data.
            </p>
          </div>
          <p className="text-sm text-gray-600">
            Supported formats: CSV, JSON. Minimum recommended: 10-20 samples for meaningful metrics.
          </p>
        </div>
      ),
    },
    {
      title: 'Step 2: Check Your Metrics',
      description: 'Review evaluation scores across frameworks',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Metrics Tab</h4>
            <p className="text-sm text-blue-800 mb-3">
              View scores from three evaluation frameworks in real-time.
            </p>
            <div className="space-y-2 text-xs text-blue-800">
              <p><strong>RAGAS:</strong> Measures groundedness, coherence, relevance, faithfulness</p>
              <p><strong>BLEU/ROUGE:</strong> Text similarity metrics (n-gram overlap)</p>
              <p><strong>LLamaIndex:</strong> LLM-based evaluation (correctness, relevancy)</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Tip: Hover over any metric card to see detailed descriptions and score ranges.
          </p>
        </div>
      ),
    },
    {
      title: 'Step 3: Analyze Low Scores',
      description: 'Get AI-powered insights on why scores are low',
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">BA Review Tab</h4>
            <p className="text-sm text-orange-800 mb-3">
              Review low-scoring prompts and get actionable recommendations.
            </p>
            <ul className="space-y-2 text-xs text-orange-800">
              <li>• See root cause analysis for each low-scoring metric</li>
              <li>• Get specific recommendations to improve scores</li>
              <li>• Estimated score improvement for each suggestion</li>
              <li>• Comparison with top-performing prompts</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 4: Search Knowledge Base',
      description: 'Validate results against indexed documents',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Knowledge Base Tab</h4>
            <p className="text-sm text-green-800 mb-3">
              Search indexed documents and compare with your monitoring data.
            </p>
            <ul className="space-y-2 text-xs text-green-800">
              <li>• Hybrid search combining semantic + text-based search</li>
              <li>• Results show relevance scores and source attribution</li>
              <li>• Compare search results with three framework scores</li>
              <li>• Validate system performance independently</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 5: Create Templates',
      description: 'Save and share successful prompts',
      content: (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 mb-2">Templates Tab</h4>
            <p className="text-sm text-indigo-800 mb-3">
              Create reusable prompt templates based on successful results.
            </p>
            <ul className="space-y-2 text-xs text-indigo-800">
              <li>• Save prompts with LLM recommendations</li>
              <li>• Clone and fork existing templates</li>
              <li>• Download templates as JSON for sharing</li>
              <li>• Track template usage and effectiveness</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 6: Configure Settings',
      description: 'Set up LLM provider and data sources',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Settings Page</h4>
            <p className="text-sm text-gray-700 mb-3">
              Configure system-wide settings and integrations.
            </p>
            <ul className="space-y-2 text-xs text-gray-700">
              <li>• Select LLM provider (Claude, OpenAI, DeepSeek, Custom)</li>
              <li>• Connect PostgreSQL database for data import</li>
              <li>• Upload documents for knowledge base</li>
              <li>• Manage data sources and embeddings</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'You are all set!',
      description: 'Start exploring the dashboard',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You now understand the key features and workflow. Let's get started!
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">Quick reminders:</p>
            <ul className="space-y-2 text-xs text-gray-700">
              <li>✓ Hover over any element to see helpful tooltips</li>
              <li>✓ Check the Feature Guide in the dashboard for detailed information</li>
              <li>✓ Configure your LLM provider in Settings first</li>
              <li>✓ Upload data in Raw Data tab to get started</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  if (!currentStep) {
    // Fallback if step is out of bounds (should not happen in normal flow)
    return null;
  }
  
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{currentStep.title}</DialogTitle>
              <DialogDescription>{currentStep.description}</DialogDescription>
            </div>
            <Badge variant="secondary">
              {step + 1} / {steps.length}
            </Badge>
          </div>
        </DialogHeader>

        <div className="py-4">
          {currentStep.content}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 rounded-full mt-4">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-3 mt-6">
          <Button
            onClick={() => setStep(step - 1)}
            disabled={isFirst}
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            onClick={() => {
              if (isLast) {
                onClose();
              } else {
                setStep(step + 1);
              }
            }}
            className="ml-auto"
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
