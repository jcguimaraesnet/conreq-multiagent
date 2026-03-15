import type { OnbordaProps } from 'onborda';
import { Settings, CheckCircle, Layers, Hash, PlusCircle, ArrowRightCircle, UserCheck, ShieldCheck, Cpu } from 'lucide-react';

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
    tour: 'home-tour',
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
    tour: 'settings-tour',
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
      {
        icon: <ArrowRightCircle className="w-5 h-5" />,
        title: 'Project Actions',
        content: projectActionsContent,
        selector: projectActionsSelector,
        side: hasProjects ? 'left' : 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
    ],
  },
  ];
}
