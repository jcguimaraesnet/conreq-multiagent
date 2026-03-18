import type { OnbordaProps } from 'onborda';
import { Settings, CheckCircle, Layers, Hash, PlusCircle, ArrowRightCircle, UserCheck, ShieldCheck, Cpu, Repeat, Scale, FolderKanban, Sparkles } from 'lucide-react';

export function getOnboardingTours(hasProjects: boolean): OnbordaProps['steps'] {
  const projectActionsSelector = hasProjects
    ? '#btn-go-to-conjectural-first'
    : '#table-actions-header';

  const projectActionsContent = hasProjects
    ? (
      <>
        Click the <strong>Go to Conjectural Requirements</strong> button to
        navigate to the AI agent where you can create new conjectural
        requirements for this project.
      </>
    )
    : (
      <>
        Use the <strong>Go to Conjectural Requirements</strong> action to
        navigate to the AI agent where you can create new conjectural
        requirements for your project.
      </>
    );

  return [
  {
    tour: 'settings-tour',
    steps: [
      {
        icon: <Settings className="w-5 h-5" />,
        title: 'Configure Your Settings',
        content: (
          <>
            Start by configuring your user settings to personalize how requirements
            are generated.
          </>
        ),
        selector: '#header-settings',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: 'settings-detail-tour',
    steps: [
      {
        icon: <UserCheck className="w-5 h-5" />,
        title: 'Human-in-the-Loop',
        content: (
          <>
            This master toggle enables <strong>human intervention</strong> during
            the conjectural requirement specification process. When turned on, the
            sub-settings below become active.
          </>
        ),
        selector: '#setting-human-in-the-loop',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
      {
        icon: <CheckCircle className="w-5 h-5" />,
        title: 'Brief Description',
        content: (
          <>
            Keep this option enabled if you already have initial ideas for your
            conjectural requirements. It ensures a description is provided before
            generation begins.
          </>
        ),
        selector: '#setting-require-description',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
      {
        icon: <ShieldCheck className="w-5 h-5" />,
        title: 'Evaluate Requirements',
        content: (
          <>
            When enabled, each conjectural requirement generated must be
            <strong> evaluated</strong> by the user using quality criteria
            before proceeding.
          </>
        ),
        selector: '#setting-require-evaluation',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
      {
        icon: <Layers className="w-5 h-5" />,
        title: 'Generation Mode',
        content: (
          <>
            Select <strong>Batch</strong> mode if you want to generate multiple
            requirements at once, or <strong>Single</strong> to generate one at a
            time.
          </>
        ),
        selector: '#setting-generation-mode',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
      {
        icon: <Hash className="w-5 h-5" />,
        title: 'Batch Quantity',
        content: (
          <>
            This option is only used when the generation mode is set to{' '}
            <strong>Batch</strong>. Adjust the number of requirements generated per
            batch (between 2 and 10).
          </>
        ),
        selector: '#setting-batch-quantity',
        side: 'top',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
      {
        icon: <Repeat className="w-5 h-5" />,
        title: 'Specification Attempts',
        content: (
          <>
            Set the number of <strong>specification attempts</strong> (1 to 3).
            Each attempt refines the conjectural requirement through additional
            rounds of AI-assisted generation and evaluation.
          </>
        ),
        selector: '#setting-spec-attempts',
        side: 'top',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
      {
        icon: <Cpu className="w-5 h-5" />,
        title: 'Model Configuration',
        content: (
          <>
            Choose the <strong>AI model family</strong> used for generating
            conjectural requirements. Different model families may produce
            varying results in quality and style.
          </>
        ),
        selector: '#setting-model',
        side: 'top',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
      {
        icon: <Scale className="w-5 h-5" />,
        title: 'Model Configuration (LLM-as-Judge)',
        content: (
          <>
            Select the <strong>AI model</strong> used for automated quality
            evaluation of conjectural requirements. This model acts as a judge,
            scoring each requirement against quality criteria.
          </>
        ),
        selector: '#setting-model-judge',
        side: 'top',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: 'sidebar-projects-tour',
    steps: [
      {
        icon: <FolderKanban className="w-5 h-5" />,
        title: 'Go to Projects',
        content: (
          <>
            Click <strong>Projects</strong> in the sidebar to create and manage
            your projects. Each project holds its own set of conjectural
            requirements.
          </>
        ),
        selector: '#sidebar-projects',
        side: 'right',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: 'projects-tour',
    steps: [
      {
        icon: <PlusCircle className="w-5 h-5" />,
        title: 'Add New Projects',
        content: (
          <>
            Click here to create a new project. Each project holds its own set of
            conjectural requirements.
          </>
        ),
        selector: '#btn-add-project',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: 'conjectural-nav-tour',
    steps: [
      {
        icon: <ArrowRightCircle className="w-5 h-5" />,
        title: 'Go to Conjectural Requirements',
        content: projectActionsContent,
        selector: projectActionsSelector,
        side: hasProjects ? 'left' : 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: 'chatbot-suggestion-tour',
    steps: [
      {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Generate Your First Requirement',
        content: (
          <>
            Click the <strong>Generate conjectural requirements</strong> suggestion
            to start creating your first conjectural requirement with AI assistance.
          </>
        ),
        selector: '.copilotKitMessages footer .suggestions button:first-child',
        side: 'top',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
    ],
  },
  ];
}
