import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "./button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog"
import { DocumentTemplate, DocumentCategory } from "@/lib/types/types"
import { Card } from "./card"
import { Input } from "./input"
import { Search } from "lucide-react"

interface TemplateSelectorDialogProps {
  category: DocumentCategory
  onTemplateSelected: (template: DocumentTemplate) => void
  existingTemplates: string[]
  trigger?: React.ReactNode
}

export function TemplateSelectorDialog({
  category,
  onTemplateSelected,
  existingTemplates,
  trigger
}: TemplateSelectorDialogProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<DocumentTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`/api/document-templates?category=${category}`)
        if (!response.ok) {
          throw new Error("Failed to fetch templates")
        }
        const data = await response.json()
        // Filter out templates that are already added to the project
        const availableTemplates = data.filter((template: DocumentTemplate) => 
          !existingTemplates.includes(template.name)
        )
        setTemplates(availableTemplates)
        setFilteredTemplates(availableTemplates)
      } catch (error) {
        console.error("Error fetching templates:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch templates")
      } finally {
        setIsLoading(false)
      }
    }

    if (open) {
      fetchTemplates()
    }
  }, [category, open, existingTemplates])

  // Filter templates based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates)
    } else {
      const filtered = templates.filter((template) => {
        const query = searchQuery.toLowerCase()
        const nameMatch = template.name.toLowerCase().includes(query)
        const descriptionMatch = template.description?.toLowerCase().includes(query) || false
        return nameMatch || descriptionMatch
      })
      setFilteredTemplates(filtered)
    }
  }, [searchQuery, templates])

  const handleTemplateSelect = async (template: DocumentTemplate) => {
    onTemplateSelected(template)
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset search when dialog closes
      setSearchQuery("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full">
            Add {category} Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select {category} Template</DialogTitle>
        </DialogHeader>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Template List with Fixed Height and Scroll */}
        <div className="flex-1 min-h-0">
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
                <p className="text-gray-500">
                  {searchQuery ? "No templates match your search" : "No available templates found"}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.name}
                    className="p-4 cursor-pointer hover:bg-gray-500/20 transition-colors"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <h3 className="font-medium">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && !error && (
          <div className="text-sm text-gray-500 mt-2 text-center">
            {filteredTemplates.length} of {templates.length} templates
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 