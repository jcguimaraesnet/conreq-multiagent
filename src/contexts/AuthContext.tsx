'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Module-level cache to persist session between navigations
let cachedSession: Session | null = null
let cachedProfile: UserProfile | null = null

interface UserProfile {
  role: string
  is_approved: boolean
}

interface AuthContextType {
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfile(supabase: ReturnType<typeof createClient>, userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('role, is_approved')
    .eq('id', userId)
    .single()
  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(cachedSession)
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile)
  const [isLoading, setIsLoading] = useState(!cachedSession)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    async function init() {
      if (!cachedSession) {
        const { data: { session } } = await supabase.auth.getSession()
        cachedSession = session
        setSession(session)

        if (session?.user) {
          const profileData = await fetchProfile(supabase, session.user.id)
          cachedProfile = profileData
          setProfile(profileData)
        }
      } else if (!cachedProfile && cachedSession?.user) {
        const profileData = await fetchProfile(supabase, cachedSession.user.id)
        cachedProfile = profileData
        setProfile(profileData)
      }
      setIsLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        cachedSession = session
        setSession(session)

        if (session?.user) {
          const profileData = await fetchProfile(supabase, session.user.id)
          cachedProfile = profileData
          setProfile(profileData)
        } else {
          cachedProfile = null
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    cachedSession = null
    cachedProfile = null
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  const user = context.session?.user ?? null

  return {
    session: context.session,
    user,
    profile: context.profile,
    isAdmin: context.profile?.role === 'admin',
    isApproved: context.profile?.is_approved ?? false,
    isLoading: context.isLoading,
    signOut: context.signOut,
  }
}
