'use client'

import { motion } from 'framer-motion'
import {
  Monitor,
  BarChart3,
  CheckCircle2,
  Keyboard,
  LayoutGrid,
} from 'lucide-react'

export default function PresentationSlide2() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full px-8"
    >
      {/* Illustration: Chatbots interacting with UI */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative w-75 h-55 mb-10"
      >
        {/* Central Monitor */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-24 h-20 rounded-xl border-2 border-gray-500/40 bg-gray-800/50 flex items-center justify-center shadow-lg">
            <Monitor className="w-10 h-10 text-gray-300" />
          </div>
          {/* Monitor stand */}
          <div className="w-8 h-2 bg-gray-600/40 rounded-b mx-auto" />
          <div className="w-14 h-1.5 bg-gray-600/30 rounded mx-auto" />
        </div>

        {/* Charts - Top Left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="absolute left-1 top-3"
        >
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-orange-900/30">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <p className="mt-1 text-[10px] leading-tight text-gray-300">Charts</p>
          <p className="text-[9px] leading-tight text-gray-400">Show charts</p>
        </motion.div>

        {/* Approvals - Top Right */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="absolute right-1 top-3 text-right"
        >
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-orange-900/30 ml-auto">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <p className="mt-1 text-[10px] leading-tight text-gray-300">Approvals</p>
          <p className="text-[9px] leading-tight text-gray-400">User confirmation</p>
        </motion.div>

        {/* Input - Bottom Left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="absolute left-6 bottom-3"
        >
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-orange-900/30">
            <Keyboard className="w-6 h-6 text-white" />
          </div>
          <p className="mt-1 text-[10px] leading-tight text-gray-300">Input</p>
          <p className="text-[9px] leading-tight text-gray-400">User input</p>
        </motion.div>

        {/* Cards - Bottom Right */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="absolute right-6 bottom-3 text-right"
        >
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-orange-900/30 ml-auto">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          <p className="mt-1 text-[10px] leading-tight text-gray-300">Cards</p>
          <p className="text-[9px] leading-tight text-gray-400">Show cards</p>
        </motion.div>

        {/* Connecting arrows */}
        <svg viewBox="0 0 300 220" className="absolute inset-0 w-full h-full" fill="none">
          {/* Left elements to monitor */}
          <path d="M 70 45 L 115 90" stroke="rgba(232,111,40,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d="M 80 175 L 120 130" stroke="rgba(232,111,40,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
          {/* Right elements to monitor */}
          <path d="M 230 45 L 185 90" stroke="rgba(232,111,40,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d="M 220 175 L 180 130" stroke="rgba(232,111,40,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
      </motion.div>

      {/* Title Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <h2 className="text-xl font-bold text-white leading-tight max-w-60">
            Many UI elements as tool calling
          </h2>
        </div>
        <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
          Multi-agent interactions occur in real time, interacting through the user interface, displaying information, receiving input, and obtaining approvals from the end user.
        </p>
      </motion.div>
    </motion.div>
  )
}
