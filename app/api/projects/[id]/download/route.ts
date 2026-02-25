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
  // Set a timeout for this operation (60 seconds for Hobby plan)
  // TODO: Change this when upgrading to a paid plan
  const timeout = setTimeout(() => {
    console.error('Download operation timed out');
  }, 55000); // 55 seconds timeout (just under the 60s limit)

  // Log the configured timeout
  console.log(`⏱️  Function configured with maxDuration: ${maxDuration} seconds`);

  const monitor = createPerformanceMonitor();
  
  try {
    const { id } = await params;
  
    if (!id) {
      return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
    }

    // Get current user profile (auth middleware already verified user exists)
    const supabase = await createClient();
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Get project with all its data and apply company filter only for non-ADMIN users
    let projectQuery = supabase
      .from('projects')
      .select(`
        *,
        template_variables,
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

    // Get all templates used in the project
    const allTemplateNames = [
      ...project.architecture_templates || [],
      ...project.constructions_templates || [],
      ...project.fire_templates || [],
      ...project.authority_processing_templates || [],
      ...project.energy_templates || [],
      ...project.hvac_templates || [],
      ...project.execution_control_templates || []
    ];

    if (allTemplateNames.length === 0) {
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

    // Process templates aggressively for 60-second limit
    console.log(`Processing ${templates.length} templates with 60s limit...`);
    
    // For 60s limit, process all templates in parallel
    const batchSize = templates.length; // Process all templates at once
    for (let i = 0; i < templates.length; i += batchSize) {
      const batch = templates.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(templates.length / batchSize)}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (template) => {
        try {
          console.log(`Processing template: ${template.name}`);

          // Check for custom template, version lock, and get the appropriate file
          // Priority: 1. Custom template, 2. Version lock, 3. Current version
          let templateFileName = template.file_name;
          let templateVariables = template.variables;
          let isCustomTemplate = false;

          // First, check if project has a custom template for this template name
          if (project.custom_templates && project.custom_templates[template.name]) {
            const customTemplate = project.custom_templates[template.name];
            console.log(`[DOWNLOAD] Using custom project template for ${template.name}`);
            templateFileName = customTemplate.file_name;
            templateVariables = customTemplate.variables;
            isCustomTemplate = true;
          }
          // If no custom template, check for version lock
          else if (project.template_version_locks && project.template_version_locks[template.name]) {
            const lockedVersion = project.template_version_locks[template.name];
            console.log(`[DOWNLOAD] Using locked version ${lockedVersion} for template ${template.name}`);

            // Fetch version-specific file from template_versions table
            const { data: versionData, error: versionError } = await supabase
              .from('template_versions')
              .select('file_name, variables')
              .eq('template_name', template.name)
              .eq('version', lockedVersion)
              .single();

            if (!versionError && versionData) {
              templateFileName = versionData.file_name;
              templateVariables = versionData.variables;
              console.log(`[DOWNLOAD] Found version ${lockedVersion} file: ${templateFileName}`);
            } else {
              console.warn(`[DOWNLOAD] Locked version ${lockedVersion} not found for ${template.name}, using current version`);
            }
          } else {
            console.log(`[DOWNLOAD] No custom template or version lock for ${template.name}, using current version`);
          }

          // Get template file from storage using the new storage service
          // Note: Custom templates are always stored as non-public (project-specific)
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

          // Get stored variables for this template (already contains resolved general/local values)
          const storedVariables = project.template_variables?.[template.category]?.[template.name]?.variables || {};

          // Reduced logging for better performance
          console.log(`Template ${template.name} - Variables count: ${Object.keys(storedVariables).length}`);

          // Convert Blob to Buffer for processing
          const arrayBuffer = await templateFile.arrayBuffer();
          const templateBuffer = Buffer.from(arrayBuffer);

          // Prepare variables for processing - normalize the keys and add common project variables
          const allVariables: { [key: string]: any } = {};

          // Create a mapping from normalized names to original tag names for content controls
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
          
          // Add all template variables (already resolved with general/local logic)
          // Handle both text values and image objects - storedVariables is DocumentVariable[]
          if (Array.isArray(storedVariables)) {
            storedVariables.forEach((variable: DocumentVariable) => {
              if (variable && variable.name) {
                const normalizedKey = normalizeVariableName(variable.name);
                const val = variable.value as any;
                const varType = (variable as any).type;
                const dropdownOptions = (variable as any).dropdownOptions;
                let processedValue: any;

                // Check if it's an image object
                if (typeof val === 'object' && val !== null && val.type === 'image') {
                  // Keep the full image object for the image processor
                  processedValue = val;
                } else if (varType === 'dropdown' && dropdownOptions) {
                  // Keep dropdown options for the content control processor
                  processedValue = {
                    type: 'dropdown',
                    value: val || '',
                    dropdownOptions: dropdownOptions
                  };
                } else {
                  processedValue = val;
                }

                // Store with normalized key for content control processor
                allVariables[normalizedKey] = processedValue;

                // Also store with original tag name if it exists in the mapping
                if (tagNameMapping[normalizedKey]) {
                  allVariables[tagNameMapping[normalizedKey]] = processedValue;
                  console.log(`Mapped variable: ${normalizedKey} → ${tagNameMapping[normalizedKey]}`);
                }
              }
            });
          }

          console.log(`Template ${template.name} - Final variables count: ${Object.keys(allVariables).length}`);

          // Use the shared document processing function
          const generatedDoc = await processDocumentWithSmartProcessor(
            templateBuffer, 
            allVariables, 
            template, 
            project.company_id
          );

          // Add to zip with category subfolder
          const categoryFolder = template.category.toLowerCase();
          const fileName = template.original_file_name || `${template.name}.docx`;
          const folderPath = `${categoryFolder}/${fileName}`;
          
          console.log(`Adding to zip: ${folderPath}`);
          mainZip.file(folderPath, generatedDoc);
          
          return { success: true, template: template.name };

        } catch (error) {
          console.error(`Error processing template ${template.name}:`, error);
          return { success: false, template: template.name, error };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Log batch results
      const successful = batchResults.filter(r => r?.success).length;
      const failed = batchResults.filter(r => !r?.success).length;
      console.log(`Batch completed: ${successful} successful, ${failed} failed`);
    }
    
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