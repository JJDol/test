import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { withAuthDynamic, AuthenticatedRequest, RouteContext } from '@/lib/auth/auth-middleware';
import { storageService } from '@/lib/services/integrations/storage-service';
import { processDocumentWithSmartProcessor } from '@/lib/services/processors/document-processor';
import { createPerformanceMonitor } from '@/utils/performance-monitor';
import { normalizeVariableName } from '@/lib/utils/variable-utils';
import { DocumentVariable } from '@/lib/types/variable-types';

// TODO: Extract common document generation logic (template access, variable processing, file response) 
// to utils/document-generation/ to eliminate duplication with /api/projects/[id]/generate-document/route.ts

/**
 * Project Bulk Document Download API Route
 * 
 * PURPOSE: Generate and download all project documents as a ZIP file
 * - Processes all project templates with stored variables
 * - Downloads and includes project images
 * - Creates organized ZIP with category-based folder structure
 */

// Configure function timeout for this specific route
// TODO: Change this when upgrading to a paid plan
export const maxDuration = 60; // 60 seconds - maximum for Hobby plan


async function 
downloadProjectHandler(
  request: AuthenticatedRequest,
  { params }: RouteContext<{ id: string }>
) {
  const timeout = setTimeout(() => {
    console.error('Download operation timed out');
  }, 55000);

  console.log(`⏱️  Function configured with maxDuration: ${maxDuration} seconds`);

  const monitor = createPerformanceMonitor();
  
  try {
    const { id } = await params;
  
    if (!id) {
      return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
    }

    // Parse optional phase_ids from request body
    let phaseIds: string[] | null = null;
    try {
      const body = await request.json();
      if (body.phase_ids && Array.isArray(body.phase_ids) && body.phase_ids.length > 0) {
        phaseIds = body.phase_ids;
      }
    } catch {
      // No body or invalid JSON — download all templates (legacy fallback)
    }

    const supabase = await createClient();
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    let projectQuery = supabase
      .from('projects')
      .select(`
        *,
        leader:leader_id (
          id,
          email,
          name,
          role
        )
      `)
      .eq('id', id);

    if (currentUserProfile.role !== 'ADMIN') {
      projectQuery = projectQuery.eq('company_id', currentUserProfile.company_id);
    }

    const { data: project, error: projectError } = await projectQuery.single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ 
        message: currentUserProfile.role === 'ADMIN' 
          ? 'Project not found' 
          : 'Project not found or not accessible in your company' 
      }, { status: 404 });
    }

    // Collect documents — from selected phases or legacy project fields
    interface PhaseDocument {
      template_name: string;
      category: string;
      variables: any;
      // ✅ 10-B fix: propagation_settings 포함하여 scope-aware lookup 가능하게
      propagation_settings: Record<string, { currentScope?: string }> | null;
      phaseName: string;
      // ✅ D2 X2'' (2026-05-13): phase-level category SSOT
      // shape: { [category]: { variables: DocumentVariable[] } }
      phaseCategoryVariables: Record<string, { variables?: Array<{ name: string; value?: unknown; type?: string; dropdownOptions?: { displayText: string; value: string }[] }> }>;
    }
    let phaseDocuments: PhaseDocument[] = [];
    let allTemplateNames: string[] = [];

    if (phaseIds && phaseIds.length > 0) {
      // Fetch documents with phase info for folder naming
      // ✅ D2 X2'' (2026-05-13): project_phase.category_variables 도 함께 select
      const { data: phaseDocs, error: phaseDocsError } = await supabase
        .from('project_phase_documents')
        .select(`
          template_name, category, variables, propagation_settings,
          project_phase:project_phase_id (
            id,
            category_variables,
            phase_definition:phase_definition_id ( short_label, name )
          )
        `)
        .in('project_phase_id', phaseIds);

      if (phaseDocsError) {
        console.error('Error fetching phase documents:', phaseDocsError);
        return NextResponse.json({ message: 'Failed to fetch phase documents' }, { status: 500 });
      }

      if (!phaseDocs || phaseDocs.length === 0) {
        return NextResponse.json({ message: 'No documents found in selected phases' }, { status: 400 });
      }

      for (const doc of phaseDocs as any[]) {
        const phaseDef = doc.project_phase?.phase_definition;
        const phaseName = phaseDef?.short_label || phaseDef?.name || 'unknown';
        phaseDocuments.push({
          template_name: doc.template_name,
          category: doc.category,
          variables: doc.variables,
          propagation_settings: doc.propagation_settings ?? null,
          phaseName,
          phaseCategoryVariables: (doc.project_phase?.category_variables ?? {}) as PhaseDocument['phaseCategoryVariables'],
        });
        if (!allTemplateNames.includes(doc.template_name)) {
          allTemplateNames.push(doc.template_name);
        }
      }
    } else {
      // Legacy fallback — gather from project-level template arrays
      allTemplateNames = [
        ...project.architecture_templates || [],
        ...project.constructions_templates || [],
        ...project.fire_templates || [],
        ...project.authority_processing_templates || [],
        ...project.energy_templates || [],
        ...project.hvac_templates || [],
        ...project.execution_control_templates || []
      ];
    }

    if (allTemplateNames.length === 0 && phaseDocuments.length === 0) {
      return NextResponse.json({ message: 'No templates found in project' }, { status: 400 });
    }

    monitor.checkpoint('Project and templates fetched');

    // Get template details
    const { data: templates, error: templatesError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('company_id', project.company_id)
      .in('name', allTemplateNames);

    if (templatesError || !templates) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json({ message: 'Failed to fetch templates' }, { status: 500 });
    }

    // Create a zip file to store all documents
    const mainZip = new JSZip();
    
    // Create images folder in zip
    const imagesFolder = mainZip.folder('images');

    // COMMENTED OUT - Image handling for future use
    // Collect all image file paths from project variables
    // const imageFilePaths = new Set<string>();
    
    // if (project.template_variables) {
    //   Object.values(project.template_variables).forEach((templateVars: any) => {
    //     if (templateVars && typeof templateVars === 'object') {
    //       Object.values(templateVars).forEach((value: any) => {
    //         if (typeof value === 'string' && value.includes('/images/') && !value.startsWith('data:')) {
    //           imageFilePaths.add(value);
    //         } else if (typeof value === 'object' && value !== null && 
    //                    value.type === 'image' && 
    //                    typeof value.value === 'string' && 
    //                    value.value.includes('/images/') && 
    //                    !value.value.startsWith('data:')) {
    //           imageFilePaths.add(value.value);
    //         }
    //       });
    //     }
    //   });
    // }

    // // Download all project images and add them to the zip (parallelized)
    // // TODO: Check if paralelization is needed
    // console.log(`Downloading ${imageFilePaths.size} images in parallel...`);
    
    // const imageDownloadPromises = Array.from(imageFilePaths).map(async (imagePath) => {
    //   try {
    //     console.log(`Downloading project image: ${imagePath}`);
        
    //     const { data: imageFile, error: imageError } = await storageService.downloadFile(
    //       {
    //         companyId: project.company_id,
    //         isPublic: false
    //       },
    //       imagePath
    //     );

    //     if (imageError || !imageFile) {
    //       console.error(`Error downloading image ${imagePath}:`, imageError);
    //       return null;
    //     }

    //     // Get filename from path
    //     const fileName = imagePath.split('/').pop() || 'image';
        
    //     // Convert blob to buffer
    //     const imageBuffer = await imageFile.arrayBuffer();
        
    //     console.log(`Successfully downloaded image: ${fileName}`);
    //     return { fileName, imageBuffer };
    //   } catch (error) {
    //     console.error(`Error processing image ${imagePath}:`, error);
    //     return null;
    //   }
    // });

    // // Wait for all image downloads to complete
    // const downloadedImages = await Promise.all(imageDownloadPromises);
    
    // monitor.checkpoint('Images downloaded');
    
    // // Add successful downloads to zip
    // downloadedImages.forEach(image => {
    //   if (image) {
    //     imagesFolder?.file(image.fileName, image.imageBuffer);
    //     console.log(`Added image to zip: ${image.fileName}`);
    //   }
    // });

    // Build a lookup from template name → template row for quick access
    const templateMap = new Map(templates.map(t => [t.name, t]));

    // Determine the list of items to process: phase documents or legacy templates
    interface ProcessItem {
      template: (typeof templates)[number];
      storedVariables: any;
      folderPrefix: string;
      // ✅ 10-B fix: phase doc의 경우 propagation_settings + category 정보 보관 (scope-aware lookup용)
      propagationSettings?: Record<string, { currentScope?: string }> | null;
      docCategory?: string;
      // ✅ D2 X2'' (2026-05-13): phase-level category SSOT (per-doc, since 다른 phase는 다른 값)
      phaseCategoryVariables?: Record<string, { variables?: Array<{ name: string; value?: unknown; type?: string; dropdownOptions?: { displayText: string; value: string }[] }> }>;
    }
    const processItems: ProcessItem[] = [];

    if (phaseDocuments.length > 0) {
      // Phase-based: one entry per phase document (same template in different phases → separate items)
      const multiPhase = phaseIds && phaseIds.length > 1;
      for (const doc of phaseDocuments) {
        const template = templateMap.get(doc.template_name);
        if (!template) continue;
        const categoryFolder = (doc.category || template.category).toLowerCase();
        const prefix = multiPhase ? `${doc.phaseName}/${categoryFolder}` : categoryFolder;
        processItems.push({
          template,
          storedVariables: doc.variables?.variables || [],
          folderPrefix: prefix,
          propagationSettings: doc.propagation_settings,
          docCategory: doc.category,
          phaseCategoryVariables: doc.phaseCategoryVariables,
        });
      }
    } else {
      // Legacy: one entry per unique template
      for (const template of templates) {
        processItems.push({
          template,
          storedVariables: project.template_variables?.[template.category]?.[template.name]?.variables || [],
          folderPrefix: template.category.toLowerCase(),
        });
      }
    }

    console.log(`Processing ${processItems.length} documents with 60s limit...`);

    // Issue 15 (D3 옵션 B): `project_deadline` template variable now resolves
    // to MAX(deadline) across all phases of the project — the project-as-a-
    // whole completion date. Computed once before the per-document loop so we
    // don't re-query for every doc in a multi-phase zip.
    const { data: allProjectPhases } = await supabase
      .from('project_phases')
      .select('deadline')
      .eq('project_id', id);
    const projectLastPhaseDeadline = (allProjectPhases ?? [])
      .map((r: any) => r.deadline as string | null)
      .filter((d): d is string => !!d)
      .reduce<string | null>(
        (max, d) => (!max || new Date(d).getTime() > new Date(max).getTime() ? d : max),
        null
      );

    const batchPromises = processItems.map(async ({ template, storedVariables, folderPrefix, propagationSettings, docCategory, phaseCategoryVariables }) => {
      try {
        console.log(`Processing template: ${template.name} (folder: ${folderPrefix})`);

        let templateFileName = template.file_name;
        let templateVariables = template.variables;
        let isCustomTemplate = false;

        if (project.custom_templates && project.custom_templates[template.name]) {
          const customTemplate = project.custom_templates[template.name];
          console.log(`[DOWNLOAD] Using custom project template for ${template.name}`);
          templateFileName = customTemplate.file_name;
          templateVariables = customTemplate.variables;
          isCustomTemplate = true;
        } else if (project.template_version_locks && project.template_version_locks[template.name]) {
          const lockedVersion = project.template_version_locks[template.name];
          console.log(`[DOWNLOAD] Using locked version ${lockedVersion} for template ${template.name}`);

          const { data: versionData, error: versionError } = await supabase
            .from('template_versions')
            .select('file_name, variables')
            .eq('template_name', template.name)
            .eq('version', lockedVersion)
            .single();

          if (!versionError && versionData) {
            templateFileName = versionData.file_name;
            templateVariables = versionData.variables;
          } else {
            console.warn(`[DOWNLOAD] Locked version ${lockedVersion} not found for ${template.name}, using current version`);
          }
        }

        const { data: templateFile, error: templateError } = await storageService.downloadFile(
          {
            companyId: template.company_id,
            isPublic: isCustomTemplate ? false : template.is_public
          },
          templateFileName
        );

        if (templateError || !templateFile) {
          console.error(`Error downloading template ${template.name}:`, templateError);
          return { success: false, template: template.name, error: templateError };
        }

        console.log(`Template ${template.name} - Variables count: ${Array.isArray(storedVariables) ? storedVariables.length : Object.keys(storedVariables).length}`);

        const arrayBuffer = await templateFile.arrayBuffer();
        const templateBuffer = Buffer.from(arrayBuffer);

        const allVariables: { [key: string]: any } = {};
        const tagNameMapping: { [normalizedKey: string]: string } = {};
        if (templateVariables && Array.isArray(templateVariables)) {
          templateVariables.forEach((templateVar: any) => {
            if (templateVar.originalTag && templateVar.name) {
              const normalizedName = normalizeVariableName(templateVar.name);
              tagNameMapping[normalizedName] = templateVar.originalTag;
            }
          });
        }

        console.log(`Template ${template.name} - Tag name mapping:`, tagNameMapping);

        if (Array.isArray(storedVariables)) {
          storedVariables.forEach((variable: DocumentVariable) => {
            if (variable && variable.name) {
              const normalizedKey = normalizeVariableName(variable.name);
              const val = variable.value as any;
              const varType = (variable as any).type;
              const dropdownOptions = (variable as any).dropdownOptions;
              let processedValue: any;

              if (typeof val === 'object' && val !== null && val.type === 'image') {
                processedValue = val;
              } else if (varType === 'dropdown' && dropdownOptions) {
                processedValue = {
                  type: 'dropdown',
                  value: val || '',
                  dropdownOptions: dropdownOptions
                };
              } else {
                processedValue = val;
              }

              allVariables[normalizedKey] = processedValue;

              if (tagNameMapping[normalizedKey]) {
                allVariables[tagNameMapping[normalizedKey]] = processedValue;
                console.log(`Mapped variable: ${normalizedKey} → ${tagNameMapping[normalizedKey]}`);
              }
            }
          });
        }

        // ✅ 10-B fix + D2 X2'' (2026-05-13): GLOBAL/CATEGORY scope 변수를 SSOT에서 merge
        // - GLOBAL: project.global_variables (project-level, 모든 phase 공유)
        // - CATEGORY: project_phase.category_variables (phase-level, 같은 phase 내만 공유)
        //   → 본 doc이 속한 phase의 category SSOT를 우선 조회, legacy fallback은 project.category_variables
        // doc.variables(local)에 entry가 없거나 비어 있어도 SSOT 값으로 채움.
        type SSOTVar = { name: string; value?: unknown; type?: string; dropdownOptions?: { displayText: string; value: string }[] };
        const propagation = (propagationSettings ?? {}) as Record<string, { currentScope?: string }>;
        const projectGlobalVars = ((project.global_variables as { variables?: SSOTVar[] } | null | undefined)?.variables ?? []) as SSOTVar[];
        const ssotCategory = (docCategory ?? template.category) as string;
        const phaseCategoryVars = ((phaseCategoryVariables as Record<string, { variables?: SSOTVar[] }> | undefined)?.[ssotCategory]?.variables ?? []) as SSOTVar[];
        const legacyProjectCategoryVars = ((project.category_variables as Record<string, { variables?: SSOTVar[] }> | null | undefined)?.[ssotCategory]?.variables ?? []) as SSOTVar[];
        // phase에 entry가 1개라도 있으면 phase가 SSOT (Issue B 명시: 빈 phase = explicit empty)
        const categoryVars: SSOTVar[] = phaseCategoryVars.length > 0 ? phaseCategoryVars : legacyProjectCategoryVars;
        const tmplVarDefs = (Array.isArray(templateVariables) ? templateVariables : []) as Array<{ name: string; type?: string }>;
        for (const tv of tmplVarDefs) {
          const name = tv.name;
          const scope = propagation[name]?.currentScope ?? 'LOCAL';
          let source: SSOTVar | undefined;
          if (scope === 'GLOBAL') {
            source = projectGlobalVars.find((g) => g.name === name);
          } else if (scope === 'CATEGORY') {
            source = categoryVars.find((c) => c.name === name);
          } else {
            continue; // LOCAL은 위에서 storedVariables로 이미 처리됨
          }
          if (!source) continue;
          const normalizedKey = normalizeVariableName(name);
          const sourceType = source.type;
          const sourceValue = source.value as any;
          let processedValue: any;
          if (sourceType === 'image' && sourceValue) {
            processedValue = source;
          } else if (sourceType === 'dropdown' && source.dropdownOptions) {
            processedValue = { type: 'dropdown', value: sourceValue ?? '', dropdownOptions: source.dropdownOptions };
          } else {
            processedValue = sourceValue;
          }
          allVariables[normalizedKey] = processedValue;
          if (tagNameMapping[normalizedKey]) {
            allVariables[tagNameMapping[normalizedKey]] = processedValue;
          }
        }

        // ✅ Issue 14 fix — common project variable fallback (SSOT 우선 → projects.* fallback)
        const lookupGlobal = (key: string): unknown => {
          const norm = normalizeVariableName(key);
          const found = projectGlobalVars.find((v) => normalizeVariableName(v.name) === norm);
          if (!found) return undefined;
          return found.type === 'text' ? (found.value ?? undefined) : found;
        };
        const setFallback = (key: string, fallbackValue: unknown) => {
          if (allVariables[key] !== undefined) return;
          const globalValue = lookupGlobal(key);
          const finalValue = globalValue !== undefined ? globalValue : fallbackValue;
          allVariables[key] = finalValue;
          if (tagNameMapping[key]) {
            allVariables[tagNameMapping[key]] = finalValue;
          }
        };
        setFallback('project_name', project.name);
        setFallback('project_location', project.location);
        setFallback(
          'project_start_date',
          project.start_date ? new Date(project.start_date).toLocaleDateString() : ''
        );
        // Issue 15: `project_deadline` = MAX(deadline) across every phase of
        // the project — the project-as-a-whole completion date. The same
        // value goes into every doc in this zip, regardless of which phase
        // the individual doc belongs to.
        setFallback(
          'project_deadline',
          projectLastPhaseDeadline ? new Date(projectLastPhaseDeadline).toLocaleDateString() : ''
        );
        setFallback('project_leader', project.leader?.name || 'Unassigned');

        console.log(`Template ${template.name} - Final variables count: ${Object.keys(allVariables).length}`);

        const generatedDoc = await processDocumentWithSmartProcessor(
          templateBuffer,
          allVariables,
          template,
          project.company_id
        );

        const fileName = template.original_file_name || `${template.name}.docx`;
        const folderPath = `${folderPrefix}/${fileName}`;

        console.log(`Adding to zip: ${folderPath}`);
        mainZip.file(folderPath, generatedDoc);

        return { success: true, template: template.name };

      } catch (error) {
        console.error(`Error processing template ${template.name}:`, error);
        return { success: false, template: template.name, error };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const successful = batchResults.filter(r => r?.success).length;
    const failed = batchResults.filter(r => !r?.success).length;
    console.log(`Batch completed: ${successful} successful, ${failed} failed`);
    
    monitor.checkpoint('Templates processed');

    // Generate the final zip file with no compression for speed
    console.log('Generating final zip file...');
    const zipContent = await mainZip.generateAsync({
      type: 'nodebuffer',
      compression: 'STORE' // No compression for maximum speed
    });

    console.log(`Generated zip file size: ${zipContent.length} bytes`);
    
    monitor.checkpoint('Zip generated');
    monitor.logSummary();

    // Clear the timeout since we're done
    clearTimeout(timeout);

    // Create a new Response with the zip data
    const response = new NextResponse(zipContent as BodyInit);
    
    // Set response headers
    response.headers.set('Content-Type', 'application/zip');
    response.headers.set('Content-Disposition', `attachment; filename="documents.zip"`);

    return response;
  } catch (error) {
    // Clear the timeout on error
    clearTimeout(timeout);
    
    console.error('Error generating project documents:', error);
    return NextResponse.json({ 
      message: 'Failed to generate project documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply dynamic authentication wrapper
export const POST = withAuthDynamic(downloadProjectHandler); 