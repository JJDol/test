/**
 * Project Templates Collection API Routes
 * 
 * PURPOSE: Manage project templates for construction projects
 * - Templates define document categories and structure for new projects
 * - Enables standardization and efficiency in project setup
 * 
 * ROUTES:
 * - GET /api/project-templates - List all templates for company
 * - POST /api/project-templates - Create new template
 */
import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware'
import { createClient } from '@/lib/supabase/server'
import { DocumentCategory } from '@/lib/types/types'

// TODO: Should this interface be in a separate file?
interface CreateProjectTemplateBody {
  name: string
  templates?: string[]
  category: DocumentCategory
}

async function getProjectTemplatesHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient()

    // Current user profile (auth middleware verified a user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single()

    if (currentUserError) throw currentUserError

    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('company_id', currentUserProfile.company_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[PROJECT_TEMPLATES][GET] Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

async function createProjectTemplateHandler(request: AuthenticatedRequest) {
  try {
    const body = (await request.json()) as CreateProjectTemplateBody
    const { name, templates = [], category } = body

    if (!name || !category) {
      return NextResponse.json({ message: 'name and category are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Current user profile
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single()

    if (currentUserError) throw currentUserError

    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 403 })
    }

    // Ensure unique name within the company
    const { data: existing, error: existingError } = await supabase
      .from('project_templates')
      .select('name')
      .eq('company_id', currentUserProfile.company_id)
      .eq('name', name)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing) {
      return NextResponse.json({ message: 'A project template with this name already exists' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('project_templates')
      .insert([{ name, templates, category, company_id: currentUserProfile.company_id }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('[PROJECT_TEMPLATES][POST] Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

export const GET = withAuth(getProjectTemplatesHandler)
export const POST = withAuth(createProjectTemplateHandler)