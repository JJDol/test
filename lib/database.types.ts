// Partial schema types — extended 2026-04 for phase system. Regenerate from Supabase when convenient.
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
      phase_definitions: {
        Row: {
          id: string
          company_id: string
          name: string
          short_label: string
          display_order: number
          description: string | null
          is_enabled: boolean
          is_default_seed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          short_label: string
          display_order: number
          description?: string | null
          is_enabled?: boolean
          is_default_seed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          short_label?: string
          display_order?: number
          description?: string | null
          is_enabled?: boolean
          is_default_seed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      project_phases: {
        Row: {
          id: string
          project_id: number
          phase_definition_id: string
          deadline: string | null
          is_current: boolean
          is_locked: boolean
          locked_by: string | null
          locked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: number
          phase_definition_id: string
          deadline?: string | null
          is_current?: boolean
          is_locked?: boolean
          locked_by?: string | null
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: number
          phase_definition_id?: string
          deadline?: string | null
          is_current?: boolean
          is_locked?: boolean
          locked_by?: string | null
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_phase_documents: {
        Row: {
          id: string
          project_phase_id: string
          category: Database["public"]["Enums"]["document_category"]
          template_name: string
          responsible_discipline: string | null
          variables: Json
          propagation_settings: Json
          assignments: Json
          review_status: Json
          template_version_lock: number | null
          origin_phase_id: string | null
          origin_document_id: string | null
          carryover_review_state: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_phase_id: string
          category: Database["public"]["Enums"]["document_category"]
          template_name: string
          responsible_discipline?: string | null
          variables?: Json
          propagation_settings?: Json
          assignments?: Json
          review_status?: Json
          template_version_lock?: number | null
          origin_phase_id?: string | null
          origin_document_id?: string | null
          carryover_review_state?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_phase_id?: string
          category?: Database["public"]["Enums"]["document_category"]
          template_name?: string
          responsible_discipline?: string | null
          variables?: Json
          propagation_settings?: Json
          assignments?: Json
          review_status?: Json
          template_version_lock?: number | null
          origin_phase_id?: string | null
          origin_document_id?: string | null
          carryover_review_state?: Json
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