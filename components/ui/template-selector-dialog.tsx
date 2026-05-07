import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "./button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog"
import { DocumentTemplate, DocumentCategory, ProjectTemplate } from "@/lib/types/types"
import { Card } from "./card"
import { Input } from "./input"
import { Search, Package, FileText, Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Checkbox } from "./checkbox"

interface TemplateSelectorDialogProps {
  category: DocumentCategory
  onTemplateSelected: (template: DocumentTemplate) => void
  onProjectTemplateSelected?: (projectTemplate: ProjectTemplate) => void
  existingTemplates: string[]
  trigger?: React.ReactNode
}

export function TemplateSelectorDialog({
  category,
  onTemplateSelected,
  onProjectTemplateSelected,
  existingTemplates,
  trigger
}: TemplateSelectorDialogProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<DocumentTemplate[]>([])
  const [filteredProjectTemplates, setFilteredProjectTemplates] = useState<ProjectTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"individual" | "packages">("individual")
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch Individual Templates
        const templatesResponse = await fetch(`/api/document-templates?category=${category}`)
        if (!templatesResponse.ok) throw new Error("Failed to fetch templates")
        const templatesData = await templatesResponse.json()
        const availableTemplates = templatesData.filter((template: DocumentTemplate) => 
          !existingTemplates.includes(template.name)
        )
        setTemplates(availableTemplates)
        setFilteredTemplates(availableTemplates)

        // Fetch Project Templates (Packages)
        const packagesResponse = await fetch(`/api/project-templates`)
        if (packagesResponse.ok) {
          const packagesData = await packagesResponse.json()
          // Filter by category
          const categoryPackages = packagesData.filter((pkg: ProjectTemplate) => pkg.category === category)
          setProjectTemplates(categoryPackages)
          setFilteredProjectTemplates(categoryPackages)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }

    if (open) {
      fetchData()
    }
  }, [category, open, existingTemplates])

  // Filter both based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim()
    
    if (!query) {
      setFilteredTemplates(templates)
      setFilteredProjectTemplates(projectTemplates)
    } else {
      setFilteredTemplates(
        templates.filter((t) => 
          t.name.toLowerCase().includes(query) || 
          t.description?.toLowerCase().includes(query)
        )
      )
      setFilteredProjectTemplates(
        projectTemplates.filter((p) => 
          p.name.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, templates, projectTemplates])

  const toggleTemplateSelection = useCallback((templateName: string) => {
    setSelectedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateName)) {
        next.delete(templateName)
      } else {
        next.add(templateName)
      }
      return next
    })
  }, [])

  const handleAddSelected = useCallback(async () => {
    const templatesToAdd = templates.filter(t => selectedTemplates.has(t.name))
    for (const template of templatesToAdd) {
      onTemplateSelected(template)
    }
    setSelectedTemplates(new Set())
    setOpen(false)
  }, [templates, selectedTemplates, onTemplateSelected])

  const handleProjectTemplateSelect = (pkg: ProjectTemplate) => {
    onProjectTemplateSelected?.(pkg)
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchQuery("")
      setSelectedTemplates(new Set())
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="flex justify-end w-full">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add {category} Document
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select {category} Documents</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="individual" className="w-full flex-1 flex flex-col min-h-0" onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Individual
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Packages
            </TabsTrigger>
          </TabsList>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={activeTab === "individual" ? "Search templates..." : "Search packages..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <TabsContent value="individual" className="flex-1 min-h-0 mt-0">
            <div className="h-[400px] overflow-y-auto pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p>Loading templates...</p>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-center px-4">
                    {searchQuery ? "No templates match your search" : "All available templates for this category have already been added to the project."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 pb-4">
                  {filteredTemplates.map((template) => {
                    const isSelected = selectedTemplates.has(template.name)
                    return (
                      <Card
                        key={template.name}
                        className={`p-4 cursor-pointer transition-colors ${isSelected ? "bg-primary/5 border-primary/50" : "hover:bg-muted/50"}`}
                        onClick={() => toggleTemplateSelection(template.name)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleTemplateSelection(template.name)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{template.name}</h3>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="packages" className="flex-1 min-h-0 mt-0">
            <div className="h-[400px] overflow-y-auto pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p>Loading packages...</p>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : filteredProjectTemplates.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-center px-4">
                    {searchQuery ? "No packages match your search" : "No project packages found for this category."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 pb-4">
                  {filteredProjectTemplates.map((pkg) => (
                    <Card
                      key={pkg.name}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleProjectTemplateSelect(pkg)}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{pkg.name}</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {pkg.templates.length} docs
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pkg.templates.slice(0, 3).map((tName) => (
                          <span key={tName} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                            {tName}
                          </span>
                        ))}
                        {pkg.templates.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                            +{pkg.templates.length - 3} more
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer: Results Count + Add Selected Button */}
        {!isLoading && !error && (
          <div className="mt-2 border-t pt-3 space-y-2">
            {activeTab === "individual" && selectedTemplates.size > 0 && (
              <Button
                className="w-full"
                onClick={handleAddSelected}
              >
                Add Selected ({selectedTemplates.size})
              </Button>
            )}
            <div className="text-sm text-gray-500 text-center">
              {activeTab === "individual" 
                ? `${filteredTemplates.length} templates available`
                : `${filteredProjectTemplates.length} packages available`
              }
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 