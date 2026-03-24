"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  BarChart3,
  BotMessageSquare,
  CheckCheck,
  ExternalLink,
  FileText,
  Github,
  Handshake,
  Play,
  Cpu,
  Layers,
  MessageSquare,
  ClipboardList,
  Workflow,
  Wrench,
  Brain,
  Scale,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Network,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { session } = useAuth();

  const demoHref = session ? "/home" : "/auth/login";
  const demoLabel = session ? "Go to App" : "App";

  return (
    <div className="min-h-screen bg-white transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black">
              <BotMessageSquare className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">
              CONREQ Multi-Agent
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6">
            CONREQ Multi-Agent: An approach to generating software requirements
            specifications with uncertainty.
          </h1>

          <div className="mb-6">
            <p className="text-gray-600 text-lg">
              <span className="font-medium text-gray-800">
                Júlio César F R Guimarães
              </span>
              <sup className="text-primary font-semibold">1</sup>
              <a
                href="https://orcid.org/0009-0004-8626-5970"
                target="_blank"
                rel="noreferrer"
                aria-label="ORCID profile of Júlio César F R Guimarães"
                className="inline-flex align-middle ml-1 text-gray-500 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              {", "}
              <span className="font-medium text-gray-800">
                Guilherme Horta Travassos
              </span>
              <sup className="text-primary font-semibold">2</sup>
              <a
                href="https://orcid.org/0000-0002-4258-0424"
                target="_blank"
                rel="noreferrer"
                aria-label="ORCID profile of Guilherme Horta Travassos"
                className="inline-flex align-middle ml-1 text-gray-500 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              {", "}
              <span className="font-medium text-gray-800">
                Rafael Maiani de Mello
              </span>
              <sup className="text-primary font-semibold">3</sup>
              <a
                href="https://orcid.org/0000-0002-9877-3946"
                target="_blank"
                rel="noreferrer"
                aria-label="ORCID profile of Rafael Melo"
                className="inline-flex align-middle ml-1 text-gray-500 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Programa de Engenharia de Sistemas e Computação (PESC),
              Universidade Federal do Rio de Janeiro (UFRJ)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Paper
            </a>
            <a
              href="https://github.com/jcguimaraesnet/app-multi-agent-conjectural-assist"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Github className="w-4 h-4" />
              Code
            </a>
            <Link
              href={demoHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-primary hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              <Play className="w-4 h-4" />
              {demoLabel}
            </Link>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mt-20 mb-10 text-center">
            Main Description
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-base leading-relaxed max-w-3xl mx-auto mb-10">
            CONREQ Multi-Agent is a system that leverages multiple AI agents
            working collaboratively to generate, refine, and validate software
            requirements specifications. The approach addresses inherent
            uncertainty in early-stage requirements by using conjectural
            reasoning — agents propose, critique, and iteratively improve
            requirements through structured dialogue. This enables teams to
            produce more complete and consistent specifications while explicitly
            managing ambiguity and assumptions throughout the process.
          </p>

          {/* Hero Image Placeholder */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm">
            <div className="aspect-video flex items-center justify-center">
              <div className="text-center">
                <BotMessageSquare className="w-16 h-16 text-primary/40 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Application Overview
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Components and Key Features */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-20 mb-10 text-center">
            Core Components
          </h2>

          {/* Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            <ComponentCard
              icon={<Brain className="w-6 h-6" />}
              title="Conjectural Agent"
              description="Generates initial requirements based on project descriptions, embracing uncertainty through conjectural reasoning and explicit assumption tracking."
            />
            <ComponentCard
              icon={<ClipboardList className="w-6 h-6" />}
              title="Specification Agent"
              description="Transforms conjectural requirements into formal, structured specifications following established standards and templates."
            />
            <ComponentCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Review Agent"
              description="Critically evaluates generated requirements for completeness, consistency, and feasibility, providing actionable feedback."
            />
            <ComponentCard
              icon={<Cpu className="w-6 h-6" />}
              title="Orchestration Layer"
              description="Coordinates agent interactions, manages workflow state, and ensures structured dialogue between all components."
            />
          </div>

          {/* Key Features */}
          <h3 className="text-2xl font-bold text-gray-900 mt-20 mb-10 text-center">
            Patterns and Characteristics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Handshake className="w-5 h-5" />}
              title="Role-based Cooperation"
              description="Agents collaborate through explicit responsibilities, where each role contributes specialized outputs to a shared objective."
            />
            <FeatureCard
              icon={<RefreshCw className="w-5 h-5" />}
              title="Iterative Refinement"
              description="Multiple review cycles ensure requirements evolve from initial conjectures to validated specifications."
            />
            <FeatureCard
              icon={<CheckCheck className="w-5 h-5" />}
              title="Human-in-the-Loop"
              description="Seamless integration of human feedback at critical decision points, combining AI efficiency with human judgment."
            />
            <FeatureCard
              icon={<Scale className="w-5 h-5" />}
              title="LLM-as-Judge"
              description="A dedicated evaluator model scores requirement quality, checks consistency across artifacts, and flags weak assumptions before approval."
            />
            <FeatureCard
              icon={<Wrench className="w-5 h-5" />}
              title="UI as Tool Calling"
              description="The agent team is initiated through the user interface, but communication is bidirectional: agents call tools in the UI, and the UI returns structured information back to the agents."
            />
            <FeatureCard
              icon={<Brain className="w-5 h-5" />}
              title="Human Reflection"
              description="Humans can pause the flow, inspect intermediate reasoning, and provide reflective feedback that guides the next agent decisions."
            />
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Prompt Optimize"
              description="Prompt strategies are continuously refined to improve instruction clarity, reduce ambiguity, and increase output reliability."
            />
            <FeatureCard
              icon={<RefreshCw className="w-5 h-5" />}
              title="Incremental Model Querying"
              description="Models are queried in staged steps, enabling progressive validation and refinement instead of one-shot generation."
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Based on Agentic Metrics"
              description="System quality is monitored with agentic metrics such as pass@k, precision, recall, F1-score, and Spearman correlation."
            />
            <FeatureCard
              icon={<SlidersHorizontal className="w-5 h-5" />}
              title="Dynamic Context Weighting"
              description="Context signals are weighted dynamically so each agent prioritizes the most relevant evidence at each step."
            />
            <FeatureCard
              icon={<Activity className="w-5 h-5" />}
              title="Progress Visualization"
              description="Execution progress, review states, and quality trends are visualized to make the multi-agent process transparent to users."
            />
            <FeatureCard
              icon={<Network className="w-5 h-5" />}
              title="Coordinator Pattern"
              description="Uses a coordinator pattern to orchestrate interactions across multiple agents, routing tasks and consolidating outputs through a structured flow."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-gray-500 text-sm">
            PESC — Programa de Engenharia de Sistemas e Computação
          </p>
          <p className="text-gray-400 text-xs mt-1">
            COPPE / Universidade Federal do Rio de Janeiro (UFRJ)
          </p>
        </div>
      </footer>
    </div>
  );
}

function ComponentCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-1">
            {title}
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
        {icon}
      </div>
      <h4 className="font-semibold text-gray-900 mb-1 text-sm">
        {title}
      </h4>
      <p className="text-xs text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
