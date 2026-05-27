import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface TemplateEditorProps {
  initialTemplate?: string;
  onSave: (template: string, metadata: TemplateMetadata) => Promise<void>;
  isLoading?: boolean;
}

interface TemplateMetadata {
  name: string;
  description: string;
  category: string;
  tags: readonly string[];
}

export function TemplateEditor({
  initialTemplate = '',
  onSave,
  isLoading = false,
}: TemplateEditorProps): React.ReactElement {
  const [template, setTemplate] = useState(initialTemplate);
  const [metadata, setMetadata] = useState<TemplateMetadata>({
    name: '',
    description: '',
    category: '',
    tags: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (): void => {
    if (tagInput.trim()) {
      setMetadata((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number): void => {
    setMetadata((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (): Promise<void> => {
    setError(null);

    if (!metadata.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!template.trim()) {
      setError('Template content is required');
      return;
    }

    try {
      await onSave(template, metadata);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving template';
      setError(message);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <Card className="p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-900 mb-1 block">Template Name *</label>
          <Input
            value={metadata.name}
            onChange={(e) =>
              setMetadata((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g., Customer Support Response"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-900 mb-1 block">Description</label>
          <Input
            value={metadata.description}
            onChange={(e) =>
              setMetadata((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Brief description of this template's purpose"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">Category</label>
            <Input
              value={metadata.category}
              onChange={(e) =>
                setMetadata((prev) => ({ ...prev, category: e.target.value }))
              }
              placeholder="e.g., support, documentation"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag and press button"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                onClick={handleAddTag}
                disabled={!tagInput.trim() || isLoading}
                variant="outline"
                size="sm"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map((tag, index) => (
              <div
                key={`${tag}-${index}`}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(index)}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-900 mb-2 block">Template Content *</label>
          <Textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Enter your prompt template here. Use {{variable}} for placeholders."
            rows={10}
            disabled={isLoading}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            {`Tip: Use double curly braces like {{context}} for dynamic placeholders`}
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>Preview:</strong> Your template will be available for download and sharing after saving.
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
