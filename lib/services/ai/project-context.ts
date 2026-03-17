
import { createTenantClient } from '@/lib/services/core/tenant-isolation';
import { AuthenticatedUser } from '@/lib/auth/auth-middleware';

export interface ProjectContext {
  companyName: string;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overDueProjects: number;
  
  // Separate user's leadership data
  myLeadershipData: {
    projectCount: number;
    projects: Array<{
      name: string;
      progress: number;
      stage: string;
      deadline: string | null;
    }>;
  };
  
  // Company-wide recent projects (with leaders)
  recentCompanyProjects: Array<{
    name: string;
    progress: number;
    stage: string;
    deadline: string | null;
    leader_name: string;
  }>;
  
  teamMembers: number;
  templates: Array<{
    name: string;
    category: string;
    usage_count: number;
  }>;
  companyLimits: {
    maxProjects: number;
    maxUsers: number;
    currentUsage: number;
  };
}

export class ProjectContextService {
  async getProjectContext(user: AuthenticatedUser): Promise<ProjectContext> {
    const supabase = await createTenantClient(user);
    
    try {
      // All queries automatically filtered by company_id due to RLS policies

      // Get project counts
      const [
        companyNameResult,
        totalProjectsResult,
        activeProjectsResult,
        completedProjectsResult,
        overdueProjectsResult,
        myLeaderProjects
      ] = await Promise.all([
        // TODO: Use API route for this
        supabase
        .from('companies')
        .select('name')
        .eq('id', user.company_id)
        .single(),

        // Total projects for the company
        // TODO: Use API route for this
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false),
          
        // Active projects (IN_PROGRESS)
        // TODO: Use API route for this
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false)
          .eq('stage', 'IN_PROGRESS'),
          
        // TODO: Use API route for this
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false)
          .eq('stage', 'COMPLETED'),
          
        // Overdue projects (active projects past deadline)
        // TODO: Use API route for this
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', false)
          .in('stage', ['IN_PROGRESS', 'TODO', 'REVIEW'])
          .lt('deadline', new Date().toISOString()),
          
        // Projects where current user is leader (simplified for now)
        // TODO: Use API route for this
        supabase
          .from('projects')
          .select('name, progress, stage, deadline')
          .eq('leader_id', user.id)
          .eq('is_archived', false)
      ]);

      // ✅ FIXED: Get recent projects with proper company isolation
      // TODO: Use API route for this
      const { data: recentProjectsRaw } = await supabase
        .from('projects')
        .select(`
          name,
          progress,
          stage,
          deadline,
          leader_id
        `)
        .eq('is_archived', false)
        .eq('company_id', user.company_id) // ← Explicit company filter
        .order('created_at', { ascending: false });

      // ✅ FIXED: Get leader names in a separate query with explicit company filtering
      const leaderIds = recentProjectsRaw?.map(p => p.leader_id).filter(Boolean) || [];
      let leaderNames: Record<string, string> = {};
      
      if (leaderIds.length > 0) {
        // TODO: Use API route for this
        const { data: leaders } = await supabase
          .from('users')
          .select('id, name')
          .eq('company_id', user.company_id) // ← Explicit company filter
          .in('id', leaderIds);
        
        leaderNames = leaders?.reduce((acc, leader) => {
          acc[leader.id] = leader.name;
          return acc;
        }, {} as Record<string, string>) || {};
      }

      // Combine project data with leader names
      const recentProjects = recentProjectsRaw?.map(p => ({
        name: p.name,
        progress: p.progress || 0,
        stage: p.stage || 'unknown',
        deadline: p.deadline,
        leader_name: leaderNames[p.leader_id] || 'Unknown'
      })) || [];

      // Get team members count for this company only
      // TODO: Use API route for this
      const { count: teamCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', user.company_id); // ← Already correct

      // ✅ FIXED: Get popular templates with explicit company filtering
      // TODO: Use API route for this
      const { data: templates } = await supabase
        .from('project_templates')
        .select('name, category')
        .eq('company_id', user.company_id) // ← Explicit company filter
        .order('created_at', { ascending: false })
        .limit(5);

      // Get company info including name
      // TODO: Use API route for this
      const { data: companyData } = await supabase
        .from('companies')
        .select('name, max_projects, max_users')
        .eq('id', user.company_id)
        .single();

      return {
        companyName: companyNameResult.data?.name || 'Unknown Company',
        totalProjects: totalProjectsResult.count || 0,
        activeProjects: activeProjectsResult.count || 0,
        completedProjects: completedProjectsResult.count || 0,
        overDueProjects: overdueProjectsResult.count || 0,
        myLeadershipData: {
          projectCount: myLeaderProjects.data?.length || 0,
          projects: myLeaderProjects.data?.map(p => ({
            name: p.name,
            progress: p.progress || 0,
            stage: p.stage || 'unknown',
            deadline: p.deadline
          })) || [],
        },
        recentCompanyProjects: recentProjects,
        teamMembers: teamCount || 0,
        templates: (templates || []).map(t => ({
          name: t.name,
          category: t.category || 'General',
          usage_count: 0 // Would need join with projects to get actual usage
        })),
        companyLimits: {
          maxProjects: companyData?.max_projects || 0,
          maxUsers: companyData?.max_users || 0,
          currentUsage: totalProjectsResult.count || 0
        }
      };
    } catch (error) {
      console.error('❌ Error fetching project context:', error);
      throw error;
    }
  }

  // ✅ ENHANCED: More robust project query detection
  static isProjectQuery(message: string): boolean {
    const projectKeywords = [
      'project', 'projects', 'deadline', 'progress', 'team', 'completion',
      'overdue', 'active', 'completed', 'template', 'leader', 'worker',
      'capacity', 'limit', 'budget', 'timeline', 'stage', 'my projects',
      'status', 'assignment', 'task', 'member', 'workload', 'company'
    ];
    
    const lowerMessage = message.toLowerCase();
    return projectKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // ✅ ENHANCED: Clean formatting with clear separation
  static formatContextForAI(context: ProjectContext, user: AuthenticatedUser): string {
    return `
COMPANY PROJECT DATA FOR ${context.companyName.toUpperCase()}
⚠️ IMPORTANT: This data is ONLY for the user's company. Never mix with other companies' data.

=== YOUR PERSONAL LEADERSHIP DATA ===
Projects YOU are the leader of: ${context.myLeadershipData.projectCount}
${context.myLeadershipData.projects.length > 0 ? 
  context.myLeadershipData.projects.map(p => 
    `• ${p.name} - ${p.progress}% complete, Stage: ${p.stage}${p.deadline ? `, Deadline: ${p.deadline}` : ''}`
  ).join('\n') : 
  '• You are not currently leading any projects'
}

=== COMPANY-WIDE PROJECT OVERVIEW ===
- Total Projects: ${context.totalProjects}
- Active Projects: ${context.activeProjects}
- Completed Projects: ${context.completedProjects}
- Overdue Projects: ${context.overDueProjects}

=== RECENT COMPANY PROJECTS (with their leaders) ===
${context.recentCompanyProjects.map(p => 
  `• ${p.name} - ${p.progress}% complete, Stage: ${p.stage}, Leader: ${p.leader_name}${p.deadline ? `, Deadline: ${p.deadline}` : ''}`
).join('\n')}

=== TEAM & CAPACITY ===
- Team Members: ${context.teamMembers}
- Project Capacity: ${context.companyLimits.currentUsage}/${context.companyLimits.maxProjects}
- Team Capacity: ${context.teamMembers}/${context.companyLimits.maxUsers}

=== AVAILABLE TEMPLATES ===
${context.templates.map(t => `• ${t.name} (${t.category})`).join('\n')}

🔒 INSTRUCTIONS: 
- When asked about "my projects" or "projects I lead" → Use YOUR PERSONAL LEADERSHIP DATA
- When asked about "company projects" or "how many projects" → Use COMPANY-WIDE PROJECT OVERVIEW
- When listing projects with leaders → Use RECENT COMPANY PROJECTS
- Keep responses professional and user-friendly
`;
  }

  // ✅ NEW: Validation method to ensure data integrity
  static validateCompanyIsolation(context: ProjectContext, user: AuthenticatedUser): boolean {
    // Add any additional validation logic here
    // For example, check if any data seems to be from wrong company
    return true; // Implement actual validation as needed
  }
}

export const projectContextService = new ProjectContextService();