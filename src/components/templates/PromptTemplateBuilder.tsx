import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { SourceSelector } from './SourceSelector';
import { TemplateEditor } from './TemplateEditor';
import { TemplateRefinement } from './TemplateRefinement';
import type { SourceItem } from './SourceSelector';

type StepType = 'sources' | 'refinement' | 'editor' | 'review';

interface Step {
  id: StepType;
  title: string;
  description: string;
}

const STEPS: readonly Step[] = [
  {
    id: 'sources',
    title: 'Select Sources',
    description: 'Choose recommendations and KB prompts to learn from',
  },
  {
    id: 'refinement',
    title: 'LLM Refinement',
    description: 'Let the LLM help improve your template',
  },
  {
    id: 'editor',
    title: 'Edit Template',
    description: 'Fine-tune the template with metadata',
  },
  {
    id: 'review',
    title: 'Review & Save',
    description: 'Final review before creating template',
  },
];

interface PromptTemplateBuilderProps {
  applicationId: string;
  onTemplateCreated?: (templateId: string) => void;
}

export function PromptTemplateBuilder({
  applicationId,
  onTemplateCreated,
}: PromptTemplateBuilderProps): React.ReactElement {
  const [currentStep, setCurrentStep] = useState<StepType>('sources');
  const [selectedSources, setSelectedSources] = useState<readonly SourceItem[]>([]);
  const [refinedTemplate, setRefinedTemplate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleSourcesSelected = (sources: readonly SourceItem[]): void => {
    setSelectedSources(sources);
    setCurrentStep('refinement');
  };

  const handleRefinementComplete = (template: string): void => {
    setRefinedTemplate(template);
    setCurrentStep('editor');
  };

  const handleTemplateEditorSave = async (
    template: string,
    metadata: { name: string; description: string; category: string; tags: readonly string[] }
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      const response = await fetch(`${apiUrl}/api/prompt-templates/app/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metadata.name,
          description: metadata.description,
          templateText: template,
          category: metadata.category,
          tags: metadata.tags,
          sourceRecommendationIds: selectedSources
            .filter((s) => s.type === 'recommendation')
            .map((s) => s.id),
          sourceKBPromptIds: selectedSources
            .filter((s) => s.type === 'kb-prompt')
            .map((s) => s.id),
          status: 'draft',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      const data = await response.json() as { success: boolean; data?: { _id?: string } };
      if (data.success && data.data?._id) {
        onTemplateCreated?.(data.data._id);
        setCurrentStep('review');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving template';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = (): void => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < STEPS.length) {
      setCurrentStep(STEPS[nextStepIndex]!.id);
    }
  };

  const handlePrevious = (): void => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(STEPS[prevStepIndex]!.id);
    }
  };

  const canNext =
    (currentStep === 'sources' && selectedSources.length > 0) ||
    (currentStep === 'refinement' && refinedTemplate.length > 0) ||
    currentStep === 'editor';

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`flex flex-col items-center gap-2 ${
                index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                  step.id === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStepIndex
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index < currentStepIndex ? '✓' : index + 1}
              </div>
              <div className="text-center">
                <p className="text-xs font-medium">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </button>

            {index < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step Content */}
      <Card className="p-6">
        {currentStep === 'sources' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Sources</h2>
            <p className="text-gray-600">
              Choose recommendations from Raw Data and prompts from Knowledge Base to learn from.
            </p>
            <SourceSelector
              applicationId={applicationId}
              onSourcesSelected={handleSourcesSelected}
            />
          </div>
        )}

        {currentStep === 'refinement' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">LLM Refinement</h2>
            <p className="text-gray-600">
              The LLM will analyze your selected sources and help create an improved template.
            </p>
            <TemplateRefinement
              applicationId={applicationId}
              sources={selectedSources}
              onComplete={handleRefinementComplete}
            />
          </div>
        )}

        {currentStep === 'editor' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Edit & Metadata</h2>
            <p className="text-gray-600">Add details about your template before saving.</p>
            <TemplateEditor
              initialTemplate={refinedTemplate}
              onSave={handleTemplateEditorSave}
              isLoading={isLoading}
            />
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Template Created</h2>
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">Your prompt template has been created successfully!</p>
              <p className="text-green-700 text-sm mt-2">
                The template is now available in your template library for download and sharing.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
          variant="outline"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="text-sm text-gray-600">
          Step {currentStepIndex + 1} of {STEPS.length}
        </div>

        {currentStep !== 'review' && (
          <Button
            onClick={handleNext}
            disabled={!canNext}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {currentStep === 'review' && (
          <Button
            onClick={() => {
              setCurrentStep('sources');
              setSelectedSources([]);
              setRefinedTemplate('');
              setError(null);
            }}
            variant="outline"
          >
            Create Another Template
          </Button>
        )}
      </div>
    </div>
  );
}
