"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Crown, FolderKanban, FileText, MessageSquare, HelpCircle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function NavigationBar() {
  const [navWidth, setNavWidth] = useState("w-64");
  const [widthValue, setWidthValue] = useState("16rem"); // 64 / 4 = 16rem
  const { currentUser } = useAuth();
  const userRole = currentUser?.role ?? null;


  // Function to handle screen size changes
  const handleResize = () => {
    // More reasonable sizes - wider on small screens, narrower on large screens
    if (window.innerWidth < 768) {
      setNavWidth("w-64");
      setWidthValue("16rem"); // 64 / 4 = 16rem
    } else if (window.innerWidth >= 768 && window.innerWidth < 1280) {
      setNavWidth("w-60");
      setWidthValue("15rem"); // 60 / 4 = 15rem
    } else if (window.innerWidth >= 1280 && window.innerWidth < 1920) {
      setNavWidth("w-56");
      setWidthValue("14rem"); // 56 / 4 = 14rem
    } else {
      setNavWidth("w-52");
      setWidthValue("13rem"); // 52 / 4 = 13rem
    }
  };

  // Add resize listener
  useEffect(() => {
    // Set initial width
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Set CSS variable for width
    document.documentElement.style.setProperty('--nav-width', widthValue);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, [widthValue]);

  // Determine current section from pathname and control accordion state
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const getSectionFromPath = (path: string): string => {
    if (path.startsWith('/protected/semantic-engine') || path.startsWith('/protected/documents')) return 'ai';
    if (path.startsWith('/protected/templates') || path.startsWith('/protected/variables') || path.startsWith('/protected/team')) return 'templates';
    if (path.startsWith('/protected/documentation')) return 'manual';
    if (path.startsWith('/protected')) return 'projects';
    return 'projects';
  };

  const [openSection, setOpenSection] = useState<string>("");

  useEffect(() => {
    setOpenSection(getSectionFromPath(pathname || '/protected'));
  }, [pathname]);

  const isActive = (href: string) => pathname === href || (pathname?.startsWith(href) ?? false);
  const activeTemplatesTab = pathname?.startsWith('/protected/templates')
    ? (searchParams?.get('tab') || 'document-templates')
    : undefined;
  const activeManualTab = pathname?.startsWith('/protected/documentation')
    ? (searchParams?.get('tab') || 'getting-started')
    : undefined;

  return (
    <nav className={`${navWidth} bg-background h-full overflow-y-auto transition-all duration-300`}>
      <div className="flex flex-col h-full">
        
        {/* Navigation links */}
        <div className="p-2 flex-1">
          <Accordion
            type="single"
            collapsible
            value={openSection}
            onValueChange={(v) => setOpenSection(v ?? "")}
          >
            {/* Projects */}
            <AccordionItem value="projects" className="border-foreground/10">
              <AccordionTrigger className="px-2">
                <span className="flex items-center gap-2 text-sm">
                  <FolderKanban className="h-4 w-4" />
                  Projects
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pt-0">
                <ul className="space-y-1">
                  <li>
                    <Link href="/protected/dashboard">
                      <Button
                        variant="ghost"
                        aria-current={isActive('/protected/dashboard') ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", isActive('/protected/dashboard') && "bg-accent text-accent-foreground")}
                      >
                        Dashboard
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href="/protected/kanban">
                      <Button
                        variant="ghost"
                        aria-current={isActive('/protected/kanban') ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", isActive('/protected/kanban') && "bg-accent text-accent-foreground")}
                      >
                        Kanban board
                      </Button>
                    </Link>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* Templates */}
            <AccordionItem value="templates" className="border-foreground/10">
              <AccordionTrigger className="px-2">
                <span className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  Templates
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pt-0">
                <ul className="space-y-1">
                  <li>
                    <Link href={{ pathname: "/protected/templates", query: { tab: 'document-templates' } }}>
                      <Button
                        variant="ghost"
                        aria-current={activeTemplatesTab === 'document-templates' ? 'page' : undefined}
                        className={cn(
                          "w-full justify-start text-sm",
                          activeTemplatesTab === 'document-templates' && "bg-accent text-accent-foreground"
                        )}
                      >
                        Document templates
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href={{ pathname: "/protected/templates", query: { tab: 'project-templates' } }}>
                      <Button
                        variant="ghost"
                        aria-current={activeTemplatesTab === 'project-templates' ? 'page' : undefined}
                        className={cn(
                          "w-full justify-start text-sm",
                          activeTemplatesTab === 'project-templates' && "bg-accent text-accent-foreground"
                        )}
                      >
                        Project templates
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href="/protected/variables">
                      <Button
                        variant="ghost"
                        aria-current={isActive('/protected/variables') ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", isActive('/protected/variables') && "bg-accent text-accent-foreground")}
                      >
                        Variables
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href="/protected/team">
                      <Button
                        variant="ghost"
                        aria-current={isActive('/protected/team') ? 'page' : undefined}
                        className={cn(
                          "w-full justify-start text-sm",
                          isActive('/protected/team') && "bg-accent text-accent-foreground"
                        )}
                      >
                        Team
                      </Button>
                    </Link>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* AI Chatbot */}
            <AccordionItem value="ai" className="border-foreground/10">
              <AccordionTrigger className="px-2">
                <span className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  AI Chatbot
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pt-0">
                <ul className="space-y-1">
                  <li>
                    <Link href="/protected/semantic-engine">
                      <Button
                        variant="ghost"
                        aria-current={isActive('/protected/semantic-engine') ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", isActive('/protected/semantic-engine') && "bg-accent text-accent-foreground")}
                      >
                        Semantic engine
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href="/protected/documents">
                      <Button
                        variant="ghost"
                        aria-current={isActive('/protected/documents') ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", isActive('/protected/documents') && "bg-accent text-accent-foreground")}
                      >
                        Documents
                      </Button>
                    </Link>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* User manual */}
            <AccordionItem value="manual" className="border-foreground/10">
              <AccordionTrigger className="px-2">
                <span className="flex items-center gap-2 text-sm">
                  <HelpCircle className="h-4 w-4" />
                  User manual
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pt-0">
                <ul className="space-y-1">
                  <li>
                    <Link href={{ pathname: "/protected/documentation", query: { tab: "getting-started" } }}>
                      <Button
                        variant="ghost"
                        aria-current={activeManualTab === 'getting-started' ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", activeManualTab === 'getting-started' && "bg-accent text-accent-foreground")}
                      >
                        Getting started
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href={{ pathname: "/protected/documentation", query: { tab: "projects" } }}>
                      <Button
                        variant="ghost"
                        aria-current={activeManualTab === 'projects' ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", activeManualTab === 'projects' && "bg-accent text-accent-foreground")}
                      >
                        Projects
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href={{ pathname: "/protected/documentation", query: { tab: "templates" } }}>
                      <Button
                        variant="ghost"
                        aria-current={activeManualTab === 'templates' ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", activeManualTab === 'templates' && "bg-accent text-accent-foreground")}
                      >
                        Templates
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href={{ pathname: "/protected/documentation", query: { tab: "ai-search" } }}>
                      <Button
                        variant="ghost"
                        aria-current={activeManualTab === 'ai-search' ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", activeManualTab === 'ai-search' && "bg-accent text-accent-foreground")}
                      >
                        AI assistant
                      </Button>
                    </Link>
                  </li>
                  <li>
                    <Link href={{ pathname: "/protected/documentation", query: { tab: "team" } }}>
                      <Button
                        variant="ghost"
                        aria-current={activeManualTab === 'team' ? 'page' : undefined}
                        className={cn("w-full justify-start text-sm", activeManualTab === 'team' && "bg-accent text-accent-foreground")}
                      >
                        Team management
                      </Button>
                    </Link>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Subscription link - visible only to ADMIN and COMPANY_ADMIN */}
          {(userRole === 'ADMIN' || userRole === 'COMPANY_ADMIN') && (
            <div className="mt-3 border-t border-foreground/10 pt-2">
              <Link href="/subscription">
                <Button variant="ghost" className="w-full text-left font-medium text-sm truncate flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-500" />
                  Subscription
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
