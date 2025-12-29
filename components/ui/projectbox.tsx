import { DeleteProject } from "./delete-project";
import { UpdateProjectForm } from "./update-project-form";
import { ArchiveProject } from "./archive-project";
import { useRouter } from "next/navigation";
import { Project } from "@/lib/types/types";
import { MoreVertical } from "lucide-react";
import { Button } from "./button";
import { toast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectBoxProps {
    project: Project;
    onProjectDeleted: () => void;
    onProjectUpdated: () => void;
    isAdmin?: boolean;
    currentUser?: { id: string; role: string; } | null;
}

export default function ProjectBox({ project, onProjectDeleted, onProjectUpdated, isAdmin, currentUser }: ProjectBoxProps) {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        // Prevent click from bubbling to parent elements
        e.stopPropagation();
        router.push(`/protected/dashboard/project/${project.id}`);
    };

    const handleActionClick = (e: React.MouseEvent) => {
        // Prevent navigating to project details when clicking actions
        e.stopPropagation();
    };


    return (
        <div
            onClick={handleClick}
            className={`border p-4 rounded shadow hover:shadow-md transition cursor-pointer ${
                project.is_archived ? 'bg-white/5 border-gray-500' : ''
            }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-bold">{project.name}</h3>
                </div>
                {(isAdmin || currentUser?.id === project.leader_id) && (
                    <div onClick={handleActionClick}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <div className="px-2 py-1.5 text-sm font-semibold text-white-900">
                                    Project Actions
                                </div>
                                {isAdmin && (
                                    <ArchiveProject 
                                        project={project}
                                        onArchived={onProjectUpdated}
                                    />
                                )}
                                {(isAdmin || currentUser?.id === project.leader_id) && (
                                    <UpdateProjectForm 
                                        project={project}
                                        onProjectUpdated={onProjectUpdated}
                                    />
                                )}
                                <div className="border-t border-gray-200 my-1"></div>
                                {(isAdmin || currentUser?.id === project.leader_id) && (
                                    <DeleteProject 
                                        project={project}
                                        onDeleted={onProjectDeleted}
                                    />
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-600">Location: {project.location || 'Not specified'}</p>
            <div className="mt-2">
                <div className="text-sm text-gray-500">Progress</div>
                <div className="w-full bg-gray-200 h-2 rounded">
                    <div
                        className={`h-2 rounded ${
                            project.progress < 50
                                ? "bg-red-500"
                                : project.progress < 100
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                        }`}
                        style={{ width: `${project.progress}%` }}
                    ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{project.progress}%</p>
            </div>
            <p className="text-sm mt-2">
                Deadline:{" "}
                <span
                    className={`font-bold ${
                        new Date(project.deadline) < new Date()
                            ? "text-red-500"
                            : "text-blue-500"
                    }`}
                >
                    {new Date(project.deadline).toLocaleDateString()}
                </span>
            </p>
            <p className="text-sm mt-2">Project Leader: {project.leader?.name || project.leader?.email || 'Unassigned'}</p>
            {project.is_archived && (
                <div className="mt-2">
                    <span className="text-sm text-gray-500 bg-gray-200/10 px-2 py-1 rounded">Archived</span>
                </div>
            )}
        </div>
    );
}