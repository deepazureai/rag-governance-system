'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart3,
  Database,
  Brain,
  BookOpen,
  Settings,
  HelpCircle,
} from 'lucide-react';

export function FeatureGuide() {
  const features = [
    {
      title: 'Metrics Tab',
      description: 'View evaluation scores from three frameworks (RAGAS, BLEU/ROUGE, LLamaIndex)',
      icon: BarChart3,
      color: 'bg-blue-100 text-blue-700',
      details: 'Displays real-time scoring data. Click metrics to see tooltips explaining each metric.',
    },
    {
      title: 'Raw Data Tab',
      description: 'Upload and review raw evaluation data before processing',
      icon: Database,
      color: 'bg-purple-100 text-purple-700',
      details: 'Import CSV/JSON data. Data is validated and stored in MongoDB.',
    },
    {
      title: 'BA Review Tab',
      description: 'Business analysts review low-scoring prompts and provide feedback',
      icon: Brain,
      color: 'bg-orange-100 text-orange-700',
      details: 'Queue of prompts needing review. Feedback improves Debugger recommendations.',
    },
    {
      title: 'Knowledge Base Tab',
      description: 'Search indexed documents and compare with monitoring data',
      icon: BookOpen,
      color: 'bg-green-100 text-green-700',
      details: 'Hybrid search combining semantic + text search. Results show relevance scores.',
    },
    {
      title: 'Settings',
      description: 'Configure LLM provider, database connections, and data sources',
      icon: Settings,
      color: 'bg-gray-100 text-gray-700',
      details: 'Set up PostgreSQL connection, select LLM provider, manage embeddings.',
    },
  ];

  const workflow = [
    {
      step: 1,
      action: 'Upload Data',
      details: 'Import raw evaluation results in Raw Data tab',
    },
    {
      step: 2,
      action: 'Review Metrics',
      description: 'Check scores in Metrics tab (hover for tooltips)',
    },
    {
      step: 3,
      action: 'Analyze Low Scores',
      description: 'Use BA Review tab for analysis and recommendations',
    },
    {
      step: 4,
      action: 'Search Knowledge Base',
      description: 'Compare results with indexed documents for validation',
    },
    {
      step: 5,
      action: 'Create Templates',
      description: 'Save successful prompts as reusable templates',
    },
    {
      step: 6,
      action: 'Configure Settings',
      description: 'Adjust LLM provider and data sources as needed',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Feature Overview</h2>
        <p className="text-gray-600">
          Navigate through tabs to upload data, analyze metrics, review results, search knowledge base, and manage configurations.
        </p>
      </div>

      {/* Feature Cards */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Tabs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <TooltipProvider key={feature.title}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="p-4 cursor-help hover:shadow-lg transition-shadow group">
                      <div className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                      <HelpCircle className="w-4 h-4 text-gray-400 mt-2 group-hover:text-blue-500 transition-colors" />
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="font-semibold text-sm mb-1">{feature.title}</p>
                    <p className="text-xs">{feature.details}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* Recommended Workflow */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Typical Workflow</h3>
        <div className="space-y-3">
          {workflow.map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex items-start">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm flex-shrink-0">
                  {item.step}
                </div>
                {idx < workflow.length - 1 && (
                  <div className="w-0.5 h-12 bg-gray-200 ml-4 mt-8" />
                )}
              </div>
              <div className="pt-1">
                <h4 className="font-semibold text-gray-900">{item.action}</h4>
                <p className="text-sm text-gray-600 mt-1">{item.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Architecture */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
        <Card className="p-4 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="space-y-4 text-sm">
            <div>
              <Badge className="bg-blue-100 text-blue-800 mb-2">Prompt Debugger Service</Badge>
              <p className="text-gray-700">
                Analyzes why prompts scored low using your configured LLM (Claude/OpenAI/DeepSeek). Provides root cause analysis and recommendations to improve scores.
              </p>
            </div>
            <div>
              <Badge className="bg-green-100 text-green-800 mb-2">Knowledge Base Service</Badge>
              <p className="text-gray-700">
                Indexes documents and data sources using LangChain embeddings and ChromaDB. Provides hybrid search combining semantic similarity with text-based search.
              </p>
            </div>
            <div>
              <Badge className="bg-purple-100 text-purple-800 mb-2">Settings Configuration</Badge>
              <p className="text-gray-700">
                Configure LLM provider, PostgreSQL connections, and embedding settings once. All services automatically use these configurations.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tips */}
      <Card className="p-4 bg-amber-50 border border-amber-200">
        <h4 className="font-semibold text-amber-900 mb-2">Tips for Best Results</h4>
        <ul className="space-y-2 text-sm text-amber-800">
          <li>• Hover over metric cards to see descriptions and score ranges</li>
          <li>• Upload at least 10-20 samples for meaningful metrics</li>
          <li>• Use BA Review to validate low-scoring results manually</li>
          <li>• Search Knowledge Base to compare internal results with external sources</li>
          <li>• Adjust LLM provider in Settings based on cost/quality trade-offs</li>
        </ul>
      </Card>
    </div>
  );
}
