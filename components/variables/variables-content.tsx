"use client";

import { useMemo } from "react";
import { useTemplates } from "@/hooks/use-templates";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export function VariablesContent() {
  const { templates, loading, error } = useTemplates();

  const templateCount = useMemo(() => templates.length, [templates]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Variables</h1>
        <p className="text-muted-foreground">Manage variables used across your master templates.</p>
      </div>

      {loading.overall && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error.overall && (
        <div className="text-sm text-red-600">{error.overall}</div>
      )}

      {!loading.overall && !error.overall && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {templateCount} template{templateCount === 1 ? "" : "s"} detected. Variables will be derived from templates.
            </div>

            <Tabs defaultValue="templates">
              <TabsList>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="coming-soon" disabled>
                  Propagation (coming soon)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="space-y-2">
                {templates.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No templates found.</div>
                ) : (
                  <ul className="list-disc pl-6">
                    {templates.map(t => (
                      <li key={t.name} className="text-sm">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted-foreground"> — {t.category}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


