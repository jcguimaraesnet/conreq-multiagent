'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, Eye, EyeOff, User, ArrowRight,
  CheckCircle, BotMessageSquare,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { signup } from '@/app/auth/actions'

interface AuthFormPanelProps {
  confirmed: boolean
}

export default function AuthFormPanel({ confirmed }: AuthFormPanelProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null)

  // Clear error when switching tabs
  useEffect(() => {
    setError(null)
    setShowPassword(false)
  }, [activeTab])

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSignupSuccess(null)

    const formData = new FormData(e.currentTarget)
    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSignupSuccess(result.message)
    }

    setIsLoading(false)
  }

  // Signup success screen
  if (signupSuccess) {
    return (
      <div className="flex-1 flex flex-col">
        <Branding />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Check Your Email
            </h1>
            <p className="text-gray-500 text-sm mb-6 max-w-sm">
              {signupSuccess}
            </p>
            <button
              onClick={() => {
                setSignupSuccess(null)
                setActiveTab('signin')
              }}
              className="inline-flex items-center gap-2 text-[#E86F28] font-medium hover:underline text-sm"
            >
              Back to Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <ContactFooter />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Branding */}
      <Branding />

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full mt-23">
        {/* Welcome Text */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome
          </h1>
          <p className="text-gray-500 text-sm">
            Sign in to your account or create a new one.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('signin')}
            className={`relative flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'signin'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`relative flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'signup'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Confirmation Success Banner */}
        {confirmed && activeTab === 'signin' && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Email confirmed successfully!</p>
              <p className="text-sm text-green-600 mt-1">You can now sign in with your credentials.</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'signin' ? (
            <motion.form
              key="signin-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSignIn}
              className="space-y-4"
            >
              {/* Email */}
              <div>
                <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    id="signin-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Enter your email address"
                    className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#E86F28] focus:border-[#E86F28] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    id="signin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-10 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#E86F28] focus:border-[#E86F28] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-[#E86F28] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <Button type="submit" fullWidth disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="signup-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSignUp}
              className="space-y-4"
            >
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <User className="w-5 h-5" />
                    </span>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      placeholder="John"
                      className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#E86F28] focus:border-[#E86F28] outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    placeholder="Doe"
                    className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#E86F28] focus:border-[#E86F28] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Enter your email address"
                    className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#E86F28] focus:border-[#E86F28] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    minLength={6}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-10 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#E86F28] focus:border-[#E86F28] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Must be at least 6 characters
                </p>
              </div>

              {/* Submit */}
              <Button type="submit" fullWidth disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-auto w-full max-w-sm">
        <Link
          href="/"
          className="block rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-600 shadow-sm transition-colors hover:bg-white hover:text-gray-800"
        >
          Click here to view the cover page.
        </Link>
      </div>

      {/* Contact Footer */}
      <ContactFooter />
    </div>
  )
}

function Branding() {
  return (
    <div className="flex items-center gap-2.5 -ml-6">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E86F28] to-[#C55A1E] flex items-center justify-center">
        <BotMessageSquare className="w-5 h-5 text-white" />
      </div>
      <span className="text-lg font-semibold text-gray-900">CONREQ Multi-Agent</span>
    </div>
  )
}

function ContactFooter() {
  return (
    <p className="mt-8 text-center text-xs text-gray-400 leading-relaxed">
      For more details or questions about this research, contact{' '}
      <a href="mailto:jcguimaraes@cos.ufrj.br" className="text-[#E86F28] hover:underline">
        jcguimaraes@cos.ufrj.br
      </a>
    </p>
  )
}
