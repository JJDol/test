// TODO investigate if we need this
import { createClient } from '@/lib/supabase/server';

export interface StorageConfig {
  companyId: string;
  isPublic?: boolean;
}

export class StorageService {
  private supabase: any;

  constructor() {
    this.supabase = null; // Will be initialized when needed
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Get the bucket name for a company
   * Format: company-{companyId}-{public|private}
   */
  private getBucketName(companyId: string, isPublic: boolean = false): string {
    const visibility = isPublic ? 'public' : 'private';
    return `company-${companyId}-${visibility}`;
  }

  /**
   * Ensure that the required buckets exist for a company
   * Creates both public and private buckets if they don't exist
   */
  async ensureCompanyBucketsExist(companyId: string): Promise<void> {
    const supabase = await this.getSupabase();
    
    const buckets = [
      { name: this.getBucketName(companyId, false), isPublic: false },
      { name: this.getBucketName(companyId, true), isPublic: true }
    ];

    for (const bucket of buckets) {
      try {
        // Check if bucket exists
        const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error('Error listing buckets:', listError);
          continue;
        }

        const bucketExists = existingBuckets?.some((b: any) => b.name === bucket.name);
        
        if (!bucketExists) {
          // Create the bucket
          const { error: createError } = await supabase.storage.createBucket(bucket.name, {
            public: bucket.isPublic,
            allowedMimeTypes: [
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/msword',
              'application/pdf',
              'image/jpeg',
              'image/png',
              'image/gif'
            ],
            fileSizeLimit: 50 * 1024 * 1024 // 50MB
          });

          if (createError) {
            console.error(`Error creating bucket ${bucket.name}:`, createError);
            throw new Error(`Failed to create storage bucket for company ${companyId}: ${createError.message}`);
          }

          console.log(`Created bucket: ${bucket.name}`);
        }
      } catch (error) {
        console.error(`Error ensuring bucket ${bucket.name} exists:`, error);
        throw error;
      }
    }
  }

  /**
   * Upload a file to the appropriate company bucket
   */
  async uploadFile(
    config: StorageConfig,
    filePath: string,
    fileBuffer: ArrayBuffer,
    options: {
      contentType?: string;
      upsert?: boolean;
    } = {}
  ): Promise<{ error: Error | null }> {
    try {
      // Ensure buckets exist first
      await this.ensureCompanyBucketsExist(config.companyId);
      
      const supabase = await this.getSupabase();
      const bucketName = this.getBucketName(config.companyId, config.isPublic);
      // TODO: Use API route for this
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: options.contentType || 'application/octet-stream',
          upsert: options.upsert || false
        });

      // Handle specific Supabase storage errors
      if (error) {
        // Check if it's a duplicate file error
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate') ||
            error.message?.includes('conflict')) {
          const enhancedError = new Error(`File "${filePath}" already exists in storage`);
          enhancedError.name = 'DuplicateFileError';
          return { error: enhancedError };
        }
        
        // Return the original error for other cases
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { error: error as Error };
    }
  }

  /**
   * Download a file from the appropriate company bucket
   */
  async downloadFile(
    config: StorageConfig,
    filePath: string
  ): Promise<{ data: Blob | null; error: Error | null }> {
    try {
      const supabase = await this.getSupabase();
      const bucketName = this.getBucketName(config.companyId, config.isPublic);
      
      // TODO: Use API route for this
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      return { data, error };
    } catch (error) {
      console.error('Error downloading file:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete a file from the appropriate company bucket
   */
  async deleteFile(
    config: StorageConfig,
    filePath: string
  ): Promise<{ error: Error | null }> {
    try {
      const supabase = await this.getSupabase();
      const bucketName = this.getBucketName(config.companyId, config.isPublic);
      
      // TODO: Use API route for this
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      return { error };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { error: error as Error };
    }
  }

  /**
   * Get the bucket name for external use
   */
  getCompanyBucketName(companyId: string, isPublic: boolean = false): string {
    return this.getBucketName(companyId, isPublic);
  }

  /**
   * Check if a file exists in the appropriate company bucket
   */
  async fileExists(
    config: StorageConfig,
    filePath: string
  ): Promise<{ exists: boolean; error: Error | null }> {
    try {
      const supabase = await this.getSupabase();
      const bucketName = this.getBucketName(config.companyId, config.isPublic);
      
      // TODO: Use API route for this
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(filePath.split('/').slice(0, -1).join('/') || '', {
          search: filePath.split('/').pop() || ''
        });

      if (error) {
        return { exists: false, error };
      }

      const exists = data && data.some((file: any) => file.name === filePath.split('/').pop());
      return { exists, error: null };
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return { exists: false, error: error as Error };
    }
  }
}

// Export a singleton instance
export const storageService = new StorageService(); 