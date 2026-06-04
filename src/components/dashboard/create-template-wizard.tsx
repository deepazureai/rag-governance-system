'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight, ChevronLeft, Sparkles, Save } from 'lucide-react';
import { RecommendationSelector } from './recommendation-selector';
import { KBPromptSelector } from './kb-prompt-selector';
import { SynthesisConfig } from './synthesis-config';

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: '1', title: 'Template Details', description: 'Name and describe your template' },
  { id: '2', title: 'Framework Setup', description: 'Define the evaluation framework' },
  { id: '3', title: 'Select Data Sources', description: 'Choose recommendations and KB prompts' },
  { id: '4', title: 'Synthesis', description: 'Generate CrewAI template' },
  { id: '5', title: 'Distribution', description: 'Set access and sharing preferences' },
];

interface CreateTemplateWizardProps {
  applicationId: string;
  userRole: string;
  onTemplateCreated?: (template: unknown) => void;
}

export function CreateTemplateWizard({
  applicationId,
  userRole,
  onTemplateCreated,
}: CreateTemplateWizardProps): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Step 1: Template Details
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  
  // Step 2: Framework
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  
  // Step 3: Data Source Selection
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<string[]>([]);
  const [selectedKBPromptIds, setSelectedKBPromptIds] = useState<string[]>([]);
  
  // Step 4: Synthesis
  const [synthesizedTemplate, setSynthesizedTemplate] = useState<{ crewaiTemplate: string; metadata: Record<string, unknown> } | null>(null);
  
  // Step 5: Distribution
  const [distributeTo, setDistributeTo] = useState<'private' | 'team' | 'public'>('private');

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0:
        return templateName.trim().length > 0;
      case 1:
        return selectedFrameworks.length > 0;
      case 2:
        return selectedRecommendationIds.length > 0 || selectedKBPromptIds.length > 0;
      case 3:
        return synthesizedTemplate !== null;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, templateName, selectedFrameworks, selectedRecommendationIds, selectedKBPromptIds, synthesizedTemplate]);

  const handleNext = useCallback((): void => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback((): void => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSave = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    try {
      if (!synthesizedTemplate) {
        alert('Template synthesis is required');
        return;
      }

      const templateData = {
        name: templateName,
        description: templateDescription,
        templateText: synthesizedTemplate.crewaiTemplate,
        crewAITemplate: synthesizedTemplate.crewaiTemplate,
        frameworks: selectedFrameworks,
        sourceRecommendationIds: selectedRecommendationIds,
        sourceKBPromptIds: selectedKBPromptIds,
        synthesisMetadata: synthesizedTemplate.metadata,
        distributionTargets: distributeTo === 'private' ? [] : [{ type: 'role', roleId: distributeTo }],
        status: 'draft',
      };

      console.log('[v0] CreateTemplateWizard saving template:', {
        applicationId,
        name: templateName,
        hasTemplate: !!synthesizedTemplate.crewaiTemplate,
        templateLength: synthesizedTemplate.crewaiTemplate?.length || 0,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/prompt-templates/app/${applicationId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData),
        }
      );

      const responseText = await response.text();
      console.log('[v0] CreateTemplateWizard response status:', response.status);
      console.log('[v0] CreateTemplateWizard response body:', responseText);

      if (!response.ok) {
        const errorMessage = responseText || response.statusText;
        throw new Error(`Failed to save template: ${errorMessage}`);
      }

      const result = JSON.parse(responseText) as unknown;
      if (onTemplateCreated) {
        onTemplateCreated(result);
      }

      alert('Template created successfully!');

      // Reset form
      setCurrentStep(0);
      setTemplateName('');
      setTemplateDescription('');
      setSelectedFrameworks([]);
      setSelectedRecommendationIds([]);
      setSelectedKBPromptIds([]);
      setSynthesizedTemplate(null);
      setDistributeTo('private');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save template';
      console.error('[v0] CreateTemplateWizard error:', message);
      alert(message);
    } finally {
      setIsSaving(false);
    }
  }, [applicationId, templateName, templateDescription, selectedFrameworks, selectedRecommendationIds, selectedKBPromptIds, synthesizedTemplate, distributeTo, onTemplateCreated]);

  const frameworks = ['groundedness', 'coherence', 'relevance', 'faithfulness', 'answerRelevancy'];

  return (
    <div className="w-full space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {WIZARD_STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => index <= currentStep && setCurrentStep(index)}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                index === currentStep
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : index < currentStep
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span className="text-xs">{step.id}</span>
              <span className="text-xs font-medium">{step.title}</span>
            </button>
            {index < WIZARD_STEPS.length - 1 && (
              <ChevronRight className={`w-4 h-4 ${index < currentStep ? 'text-green-600' : 'text-gray-400'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6 border border-gray-200">
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Template Name</label>
              <Input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Customer Support Evaluator"
                className="border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe the purpose and use cases for this template..."
                className="w-full p-3 border border-gray-300 rounded-md text-sm"
                rows={4}
              />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Select Evaluation Frameworks</h3>
            <div className="grid grid-cols-2 gap-3">
              {frameworks.map((framework) => (
                <label key={framework} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedFrameworks.includes(framework)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFrameworks((prev) => [...prev, framework]);
                      } else {
                        setSelectedFrameworks((prev) => prev.filter((f) => f !== framework));
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">{framework}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Select Data Sources for Synthesis</h3>
            
            {/* Recommendations Selector */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">BA Review Recommendations</h4>
              <RecommendationSelector
                applicationId={applicationId}
                selectedIds={selectedRecommendationIds}
                onSelectionChange={setSelectedRecommendationIds}
              />
            </div>

            {/* KB Prompts Selector */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Knowledge Base Prompts</h4>
              <KBPromptSelector
                applicationId={applicationId}
                selectedIds={selectedKBPromptIds}
                onSelectionChange={setSelectedKBPromptIds}
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <SynthesisConfig
              applicationId={applicationId}
              selectedRecommendationIds={selectedRecommendationIds}
              selectedKBPromptIds={selectedKBPromptIds}
              selectedFrameworks={selectedFrameworks}
              templateName={templateName}
              onSynthesisComplete={(template) => setSynthesizedTemplate(template)}
            />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Template Distribution</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="distribution"
                  value="private"
                  checked={distributeTo === 'private'}
                  onChange={(e) => setDistributeTo(e.target.value as 'private' | 'team' | 'public')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900">Private</div>
                  <div className="text-sm text-gray-600">Only you can access and edit</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="distribution"
                  value="team"
                  checked={distributeTo === 'team'}
                  onChange={(e) => setDistributeTo(e.target.value as 'private' | 'team' | 'public')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900">Team</div>
                  <div className="text-sm text-gray-600">Share with team members (read-only)</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="distribution"
                  value="public"
                  checked={distributeTo === 'public'}
                  onChange={(e) => setDistributeTo(e.target.value as 'private' | 'team' | 'public')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900">Public</div>
                  <div className="text-sm text-gray-600">Available to all users in the platform</div>
                </div>
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="text-sm text-gray-600">
          Step {currentStep + 1} of {WIZARD_STEPS.length}
        </div>

        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={!canProceed() || isSaving}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Create Template'}
          </Button>
        )}
      </div>
    </div>
  );
}
