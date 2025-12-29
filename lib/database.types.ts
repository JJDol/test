// TODO: This is old investigate if needed, look at the database in supabase dashboard and adapt it to the new database
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      document_templates: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          variables: string[]
          file_path: string
          is_default: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          category: string
          variables: string[]
          file_path: string
          is_default?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          variables?: string[]
          file_path?: string
          is_default?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: number
          name: string
          type: string
          address: string
          progress: number
          deadline: string
          assignedTo: string
          stage: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          type: string
          address: string
          progress?: number
          deadline: string
          assignedTo: string
          stage?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          type?: string
          address?: string
          progress?: number
          deadline?: string
          assignedTo?: string
          stage?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_category: 'ARCHITECTURE' | 'CONSTRUCTIONS' | 'FIRE' | 'AUTHORITY_PROCESSING' | 'ENERGY' | 'HVAC' | 'EXECUTION_CONTROL'
      document_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED'
      project_stage: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
    }
  }
} 