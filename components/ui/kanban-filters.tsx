"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Users, Building2 } from "lucide-react";
import { Project, ProjectStage } from "@/lib/types/types";
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface KanbanFiltersProps {
  projects: Project[];
  filteredProjects: Project[];
  filters: FilterState;
  users: User[];
  onFiltersChange: (filters: FilterState) => void;
  userRole: string;
  isCompanyAdmin: boolean;
  isAdmin: boolean;
}

interface FilterState {
  search: string;
  stage: string;
  assignee: string;
  priority: string;
  projectType: string;
  location: string;
  deadlineRange: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function KanbanFilters({ 
  projects, 
  filteredProjects, 
  filters,
  users,
  onFiltersChange, 
  userRole, 
  isCompanyAdmin, 
  isAdmin 
}: KanbanFiltersProps) {

  const [isExpanded, setIsExpanded] = useState(false);

  // Extract unique values for filter options
  const stages = Object.values(ProjectStage);
  const assignees = Array.from(new Set(projects.map(p => p.leader_id).filter(Boolean)));
  const locations = Array.from(new Set(projects.map(p => p.location).filter(Boolean)));
  
  // Priority options for construction industry
  // TODO: Uncomment when priority field is added to projects table
  // const priorities = ["Critical", "High", "Medium", "Low"];
  
  // Project type options for construction industry
  // TODO: Uncomment when project_type field is added to projects table
  // const projectTypes = ["Residential", "Commercial", "Infrastructure", "Industrial", "Renovation"];

  //TODO: Consider if we need advanced filters

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      stage: "",
      assignee: "",
      priority: "",
      projectType: "",
      location: "",
      deadlineRange: ""
    };
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== "" && value !== "all");

  return (
    <div className="mb-6 space-y-4">
      {/* Main Search and Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects by name, location, leader, or description..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filters.stage || "all"} onValueChange={(value) => handleFilterChange("stage", value === "all" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0"
        >
          <Filter className="h-4 w-4 mr-2" />
          {isExpanded ? "Hide" : "Advanced"} Filters
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="shrink-0 text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
          {/* Role-based filters - only show for managers and above */}
          {(isCompanyAdmin || isAdmin || userRole === "PROJECT_MANAGER") && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assignee
              </Label>
              <Select value={filters.assignee || "all"} onValueChange={(value) => handleFilterChange("assignee", value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{user.name || user.email}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* TODO: Consider if we need location filter */} 
          {/* Company-wide filters - only for company admins and above */}
          {(isCompanyAdmin || isAdmin) && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Location
                </Label>
                <Select value={filters.location || "all"} onValueChange={(value) => handleFilterChange("location", value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority filter - TODO: Uncomment when priority field is added to projects table */}
              {/* <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Priority
                </Label>
                <Select value={filters.priority || "all"} onValueChange={(value) => handleFilterChange("priority", value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {priorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Project Type filter - TODO: Uncomment when project_type field is added to projects table */}
              {/* <div className="space-y-2">
                <Label className="text-sm font-medium">Project Type</Label>
                <Select value={filters.projectType || "all"} onValueChange={(value) => handleFilterChange("projectType", value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {projectTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}
            </>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {filteredProjects.length} of {projects.length} projects
          </Badge>
          {hasActiveFilters && (
            <span className="text-gray-500">
              (filtered)
            </span>
          )}
          {(isCompanyAdmin || isAdmin || userRole === "PROJECT_MANAGER") && (
            <Badge variant="outline" className="text-xs">
              {users.length} team members
            </Badge>
          )}
        </div>
        
        {/* Role indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Viewing as:</span>
          <Badge variant="outline" className="text-xs">
            {isAdmin ? "System Admin" : isCompanyAdmin ? "Company Admin" : userRole.replace("_", " ")}
          </Badge>
        </div>
      </div>
    </div>
  );
}
