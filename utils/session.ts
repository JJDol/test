import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
} 