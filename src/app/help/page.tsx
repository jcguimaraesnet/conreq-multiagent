"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageTitle from "@/components/ui/PageTitle";
import { Minus, Plus, Mail, FileText } from "lucide-react";
import { type ReactNode } from "react";

const categories = [
  "This Research",
  "Projects",
  "Tools",
  "New Account",
];

const faqData = [
  {
    category: "This Research",
    question: "What is CONREQ Multi-Agent?",
    answer:
      "CONREQ Multi-Agent is a master's research project that explores the use of AI agents to specify conjectural software requirements. The system leverages a collaborative multi-agent architecture where specialized AI agents work together to help requirements engineers identify, analyze, and generate requirements under conditions of uncertainty — bridging the gap between incomplete information and well-defined specifications.",
  },
  {
    category: "This Research",
    question: "What is a conjectural requirement?",
    answer:
      "A conjectural requirement is a type of software requirement characterized by uncertainty. Unlike traditional requirements, which are assumed to be well-defined and stable, conjectural requirements acknowledge that certain aspects of a system may not yet be fully understood. They represent informed hypotheses about what the system might need, serving as a starting point for exploration, validation, and refinement as more knowledge is gained throughout the development process.",
  },
  {
    category: "Projects",
    question: "How do I create a project?",
    answer:
      "To create a project in this application, you need two important documents about a given project: the project vision document (no predefined format required) and optionally a document listing the functional and non-functional requirements (also no predefined format). Both files must be in PDF format, and they will be intelligently captured and understood by the application.",
  },
  {
    category: "Projects",
    question: "Are there any sample documents I can use to create a project?",
    answer: (
      <>
        <p className="mb-4">
          The two documents below were used during the implementation and testing of this solution. Feel free to download and use them as a reference when creating your first project.
        </p>
        <div className="flex gap-6">
          <a
            href="/sample/huddle-vision.pdf"
            download
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <FileText className="w-10 h-10 text-red-500 group-hover:text-red-600 transition-colors" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Project Vision</span>
          </a>
          <a
            href="/sample/hudde-requirements.pdf"
            download
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <FileText className="w-10 h-10 text-red-500 group-hover:text-red-600 transition-colors" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requirements</span>
          </a>
        </div>
      </>
    ) as ReactNode,
  },
  {
    category: "Tools",
    question: "How can I display the requirement evaluations chart?",
    answer:
      "This tool shows a radar chart in the chatbot area with requirement evaluations from an LLM-as-Judge and/or human evaluators. Try a prompt like: \"Display the evaluations chart for requirement REQ-C999.\"",
  },
  {
    category: "Tools",
    question: "How can I change a requirement status on the Kanban board?",
    answer:
      "This tool moves a requirement from one Kanban column to another and updates its status accordingly. Try a prompt like: \"Change the status of requirement REQ-C999 to done.\"",
  },
  {
    category: "Tools",
    question: "How can I open the requirement details popup?",
    answer:
      "This tool opens the requirement details popup so you can inspect a specific requirement. Try a prompt like: \"Show the details for requirement REQ-C999.\"",
  },
  {
    category: "New Account",
    question: "Can other people have accounts in this application?",
    answer:
      "It depends. New users must be approved by the project administrator and researcher because there are costs associated with using LLM models in the application. Anyone can sign up normally, but after registering they need to contact the project administrator and researcher, provide additional context, and request approval.",
  },
];

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = activeCategory
    ? faqData.filter((faq) => faq.category === activeCategory)
    : faqData;

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-7.5rem)]">
        {/* Page title — fixed at top */}
        <div className="shrink-0">
          <PageTitle
            title="Help"
            subtitle="Everything you need to know about features, usage, and troubleshooting."
          />
        </div>

        {/* Tags + FAQ — scrollable middle area */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8">
          {/* Category Tags */}
          <div className="flex flex-col gap-2 w-56 shrink-0">
            <button
              onClick={() => {
                setActiveCategory(null);
                setOpenIndex(null);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors text-left cursor-pointer ${
                activeCategory === null
                  ? "bg-primary text-black"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              All Topics
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setOpenIndex(null);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors text-left cursor-pointer ${
                  activeCategory === category
                    ? "bg-primary text-black"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ Accordion — own scroll */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-2 styled-scrollbar">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFaqs.map((faq, index) => (
                <div key={index}>
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between py-5 text-left cursor-pointer"
                  >
                    <span className="text-base font-medium text-gray-900 dark:text-white pr-4">
                      {faq.question}
                    </span>
                    {openIndex === index ? (
                      <Minus className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                    ) : (
                      <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                    )}
                  </button>
                  {openIndex === index && (
                    <div className="pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">
                      {typeof faq.answer === "string" ? <p>{faq.answer}</p> : faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Still have questions? — fixed at bottom */}
        <div className="shrink-0 mt-6 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm p-8 relative overflow-hidden">
          {/* Contact-themed background decoration */}
          <svg className="absolute inset-0 w-full h-full text-gray-400 dark:text-gray-500" viewBox="0 0 800 130" preserveAspectRatio="none" style={{ opacity: 0.08 }}>
            <defs>
              <linearGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
                <stop offset="40%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="white" stopOpacity="1" />
              </linearGradient>
              <mask id="fadeMask">
                <rect width="800" height="130" fill="url(#fadeRight)" />
              </mask>
            </defs>
            <g mask="url(#fadeMask)">
              {/* Envelope */}
              <rect x="420" y="15" width="60" height="42" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
              <polyline points="420,15 450,40 480,15" fill="none" stroke="currentColor" strokeWidth="3" />
              {/* Chat bubble */}
              <rect x="520" y="55" width="65" height="45" rx="10" fill="none" stroke="currentColor" strokeWidth="3" />
              <polygon points="530,100 540,115 550,100" fill="currentColor" />
              <line x1="533" y1="70" x2="572" y2="70" stroke="currentColor" strokeWidth="2.5" />
              <line x1="533" y1="82" x2="560" y2="82" stroke="currentColor" strokeWidth="2.5" />
              {/* @ symbol */}
              <circle cx="670" cy="45" r="22" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle cx="670" cy="45" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M680,45 C680,58 670,62 660,56" fill="none" stroke="currentColor" strokeWidth="2.5" />
              {/* Send / paper plane */}
              <polygon points="500,10 540,28 508,34" fill="currentColor" />
              <polygon points="508,34 540,28 522,52" fill="currentColor" opacity="0.6" />
              {/* Phone */}
              <rect x="620" y="75" width="28" height="48" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <line x1="630" y1="113" x2="642" y2="113" stroke="currentColor" strokeWidth="2.5" />
              {/* Dots */}
              <circle cx="730" cy="85" r="4" fill="currentColor" />
              <circle cx="750" cy="85" r="4" fill="currentColor" />
              <circle cx="770" cy="85" r="4" fill="currentColor" />
              {/* Lines */}
              <rect x="710" y="20" width="50" height="6" rx="3" fill="currentColor" />
              <rect x="710" y="35" width="35" height="6" rx="3" fill="currentColor" />
            </g>
          </svg>

          <div className="relative">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Still have questions?
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-xl">
              Contact me if you have any questions about this research.
            </p>
            <a
              href="mailto:jcguimaraes@cos.ufrj.br"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Mail className="w-4 h-4" />
              jcguimaraes@cos.ufrj.br
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
