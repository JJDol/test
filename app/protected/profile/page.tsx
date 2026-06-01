"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/ui/loading-state";
import CompanySettings from "@/components/ui/company-settings";

import { useAuth } from "@/hooks/use-auth";
import { useColleagues } from "@/hooks/use-colleagues";
import { useProfile, type Project } from "@/hooks/use-profile";

// Components
import { ProfileForm } from "@/components/profile/profile-form";
import { ProjectsList } from "@/components/profile/projects-list";
import { ColleaguesManagement } from "@/components/profile/colleagues-management";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile");
  
  // Existing hooks
  const { currentUser, user, isLoading, isAdmin, isCompanyAdmin } = useAuth();
  
  const {
    projects,
    projectsLoading,
    projectsError,
    fetchAssignedProjects,
  } = useProfile();

  const {
    colleagues,
    invitations,
    loadingStates: colleaguesLoadingStates,
    errors: colleaguesErrors,
    fetchColleagues,
    deleteColleague,
    revokeInvitation,
    resendInvitation,
    onColleagueAdded,
    canDeleteColleague,
    getDeletionBlockReason,
  } = useColleagues();

  // Check for URL hash to determine active tab on mount
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // If URL has #projects hash, select projects tab
      if (window.location.hash === '#projects') {
        setActiveTab('projects');
      } else if (window.location.hash === '#colleagues') {
        setActiveTab('colleagues');
      } else if (window.location.hash === '#company-settings') {
        setActiveTab('company-settings');
      }
    }
  }, []);

  // Listen for browser back/forward button clicks
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#projects') {
        setActiveTab('projects');
      } else if (hash === '#colleagues') {
        setActiveTab('colleagues');
      } else if (hash === '#company-settings') {
        setActiveTab('company-settings');
      } else if (!hash || hash === '#profile') {
        setActiveTab('profile');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  // Update URL when tab changes (but avoid infinite loops)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash;
      const expectedHash = activeTab === 'profile' ? '' : `#${activeTab}`;
      
      if (currentHash !== expectedHash) {
        if (activeTab === 'profile') {
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          window.history.replaceState(null, '', `#${activeTab}`);
        }
      }
    }
  }, [activeTab]);

  // Load assigned projects when user data is available
  useEffect(() => {
    if (currentUser?.assigned_projects && currentUser.assigned_projects.length > 0) {
      fetchAssignedProjects();
    }
  }, [currentUser?.assigned_projects, fetchAssignedProjects]);

  // Fetch colleagues when user data is loaded and user is COMPANY_ADMIN
  useEffect(() => {
    if (currentUser && (isCompanyAdmin || isAdmin)) {
      fetchColleagues();
    }
  }, [currentUser, isCompanyAdmin, isAdmin, fetchColleagues]);

  if (isLoading) {
    return (
      <LoadingState 
        title="Loading Profile"
        message="Please wait while we load your profile information..."
        variant="page"
      />
    );
  }
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL immediately for better UX
    if (typeof window !== 'undefined') {
      if (value === 'profile') {
        // Remove hash for profile tab (default)
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        // Add hash for other tabs
        window.history.replaceState(null, '', `#${value}`);
      }
    }
  };

  return (
    <ProtectedPageWrapper loadingMessage="Loading profile...">
      <div className="container mx-auto py-10">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full max-w-md ${(isCompanyAdmin || isAdmin) ? 'grid-cols-4' : 'grid-cols-2'}`}>
            <TabsTrigger value="profile" aria-label="Profile settings and personal information">
              Profile
            </TabsTrigger>
            <TabsTrigger value="projects" aria-label="View your assigned projects">
              My Projects
            </TabsTrigger>
            {(isCompanyAdmin || isAdmin) && (
              <TabsTrigger value="colleagues" aria-label="Manage team members and colleagues">
                Team
              </TabsTrigger>
            )}
            {(isCompanyAdmin || isAdmin) && (
              <TabsTrigger value="company-settings" aria-label="Company settings and configuration">
                Company
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="profile">
            <div className="grid gap-6">
              <ProfileForm />
            </div>
          </TabsContent>
          
          <TabsContent value="projects" id="projects">
            <ProjectsList
              projects={projects}
              isLoading={projectsLoading}
              error={projectsError}
            />
          </TabsContent>

          {(isCompanyAdmin || isAdmin) && (
            <TabsContent value="colleagues" id="colleagues">
              <ColleaguesManagement
                colleagues={colleagues}
                invitations={invitations}
                isLoading={colleaguesLoadingStates.colleagues}
                isInvitationActionPending={colleaguesLoadingStates.invitationAction}
                error={colleaguesErrors.colleagues}
                currentUserId={currentUser?.id || ""}
                onColleagueAdded={onColleagueAdded}
                onRevokeInvitation={revokeInvitation}
                onResendInvitation={resendInvitation}
                canDeleteColleague={canDeleteColleague}
                getDeletionBlockReason={getDeletionBlockReason}
                onColleagueRoleUpdated={onColleagueAdded}
              />
            </TabsContent>
          )}

          {(isCompanyAdmin || isAdmin) && (
            <TabsContent value="company-settings" id="company-settings">
              <CompanySettings isAdmin={isAdmin} isCompanyAdmin={isCompanyAdmin} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ProtectedPageWrapper>
  );
} 