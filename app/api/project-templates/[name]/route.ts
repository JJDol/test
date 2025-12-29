/**
 * Project Template Individual Operations API Routes
 * 
 * PURPOSE: Manage individual project templates by name
 * - Provides CRUD operations for specific templates
 * - Uses template name as unique identifier within company
 * - Supports template updates and deletion
 * 
 * ROUTES:
 * - GET /api/project-templates/[name] - Get specific template
 * - PATCH /api/project-templates/[name] - Update template
 * - DELETE /api/project-templates/[name] - Delete template
 */
import { NextResponse } from 'next/server'
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware'
import { createClient } from '@/lib/supabase/server'
import { DocumentCategory } from '@/lib/types/types'

// TODO: Should this interface be in a separate file?
interface UpdateProjectTemplateBody {
  name?: string
  templates?: string[]
  category?: DocumentCategory
}

async function getProjectTemplateHandler(request: AuthenticatedRequest, { params }: RouteContext<{ name: string }>) {
  try {
    const { name } = await params
    const supabase = await createClient()

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
      .eq('name', name)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[PROJECT_TEMPLATES][GET_ONE] Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

async function updateProjectTemplateHandler(request: AuthenticatedRequest, { params }: RouteContext<{ name: string }>) {
  try {
    const originalName = (await params).name
    const body = (await request.json()) as UpdateProjectTemplateBody

    if (!body || (!body.name && !body.templates && !body.category)) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single()

    if (currentUserError) throw currentUserError
    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 403 })
    }

    // Optional uniqueness check if name is changing
    if (body.name && body.name !== originalName) {
      const { data: exists, error: existsError } = await supabase
        .from('project_templates')
        .select('name')
        .eq('company_id', currentUserProfile.company_id)
        .eq('name', body.name)
        .maybeSingle()

      if (existsError) throw existsError
      if (exists) return NextResponse.json({ message: 'A project template with this name already exists' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('project_templates')
      .update({
        ...(body.name ? { name: body.name } : {}),
        ...(body.templates ? { templates: body.templates } : {}),
        ...(body.category ? { category: body.category } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', currentUserProfile.company_id)
      .eq('name', originalName)
      .select('*')
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[PROJECT_TEMPLATES][PATCH] Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

async function deleteProjectTemplateHandler(request: AuthenticatedRequest, { params }: RouteContext<{ name: string }>) {
  try {
    const { name } = await params
    const supabase = await createClient()

    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single()

    if (currentUserError) throw currentUserError
    if (!currentUserProfile.company_id) {
      return NextResponse.json({ error: 'User not assigned to a company' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_templates')
      .delete()
      .eq('company_id', currentUserProfile.company_id)
      .eq('name', name)

    if (error) throw error

    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('[PROJECT_TEMPLATES][DELETE] Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

export const GET = withAuthDynamic(getProjectTemplateHandler)
export const PATCH = withAuthDynamic(updateProjectTemplateHandler)
export const DELETE = withAuthDynamic(deleteProjectTemplateHandler)