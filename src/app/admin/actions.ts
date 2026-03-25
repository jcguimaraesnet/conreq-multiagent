'use server'

import { createClient } from '@/lib/supabase/server'

export interface AdminUser {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string
  is_approved: boolean
  created_at: string | null
}

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ userId: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Not authorized' }
  return { userId: user.id }
}

export async function fetchAllUsers(): Promise<{ data?: AdminUser[]; error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, is_approved, created_at')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data as AdminUser[] }
}

export async function approveUsers(userIds: string[]): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  const { error } = await supabase
    .from('profiles')
    .update({ is_approved: true })
    .in('id', userIds)

  if (error) return { error: error.message }
  return { success: true }
}

export async function revokeApproval(userIds: string[]): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  // Prevent revoking own approval
  if ('userId' in auth && userIds.includes(auth.userId)) {
    return { error: 'You cannot revoke your own approval' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_approved: false })
    .in('id', userIds)

  if (error) return { error: error.message }
  return { success: true }
}

export async function promoteToAdmin(userIds: string[]): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  if ('userId' in auth && userIds.includes(auth.userId)) {
    return { error: 'You cannot modify your own role' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin', is_approved: true })
    .in('id', userIds)

  if (error) return { error: error.message }
  return { success: true }
}

export async function demoteToUser(userIds: string[]): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  if ('userId' in auth && userIds.includes(auth.userId)) {
    return { error: 'You cannot modify your own role' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'user' })
    .in('id', userIds)

  if (error) return { error: error.message }
  return { success: true }
}
