import AuthFormPanel from '@/components/auth/AuthFormPanel'
import PresentationPanel from '@/components/auth/PresentationPanel'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 md:p-8">
      {/* Outer wrapper with rounded corners and shadow */}
      <div className="w-full max-w-300 rounded-3xl shadow-xl bg-gray-50 p-5">
        <div className="flex gap-5 h-200">
          {/* Left: Form Card — equal width */}
          <div className="w-full lg:w-1/2 flex flex-col bg-white rounded-2xl border border-gray-200 pt-5 px-8 pb-8 md:pt-6 md:px-12 md:pb-12 overflow-y-auto">
            <AuthFormPanel />
          </div>

          {/* Right: Presentation Card — equal width */}
          <PresentationPanel />
        </div>
      </div>
    </div>
  )
}
