"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DocumentCategory } from "@/lib/types/types"

interface DeleteTemplateProps {
  templateName: string
  category: DocumentCategory
  onDelete: (templateName: string, category: DocumentCategory) => void
}

export function DeleteTemplate({
  templateName,
  category,
  onDelete,
}: DeleteTemplateProps) {
  const [open, setOpen] = React.useState(false)

  const handleDelete = () => {
    onDelete(templateName, category)
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Remove
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the template &quot;{templateName}&quot; from your project. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>
            Remove Template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 