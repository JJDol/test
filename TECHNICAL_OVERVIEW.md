# Aticon Management Tool - Technical Overview

## Table of Contents
1. [Application Purpose](#application-purpose)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Core Application Flows](#core-application-flows)
7. [AI & Semantic Search](#ai--semantic-search)
8. [File Structure](#file-structure)
9. [API Design](#api-design)
10. [Migration Status](#migration-status)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)

## Application Purpose

Aticon Management Tool is a comprehensive web application designed for architecture and construction professionals. It serves as a centralized platform for:

- **Project Management**: Creating, tracking, and managing construction/architecture projects
- **Document Management**: Using templates, generating documents, and managing project documentation
- **Team Collaboration**: Multi-tenant company structure with role-based access control
- **AI-Powered Search**: Semantic search through documents and Danish building regulations (BR18)
- **Workflow Automation**: Template-based document generation with variable management

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────────┐
│                    Next.js Frontend                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐   │
│  │    Pages    │ │ Components  │ │   API       │ │   Utils  │   │
│  │             │ │             │ │   Routes    │ │          │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────┐
│                   External Services               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │  Supabase   │ │  OpenAI     │ │   Qdrant    │  │
│  │ (Database   │ │   (AI)      │ │  (Vector    │  │
│  │  & Auth)    │ │             │ │   Store)    │  │
│  └─────────────┘ └─────────────┘ └─────────────┘  │
└───────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
User Request → Next.js Router → Middleware (Auth) → API Route → External Service → Response
     ↓
Authentication Check (Supabase)
     ↓
Authorization Check (RLS + Role-based)
     ↓
Business Logic Processing
     ↓
Database Operations (Supabase) / AI Operations (OpenAI/Qdrant)
     ↓
Response with Data
```

## Technology Stack

### Frontend Stack
- **Next.js 14**: React framework with App Router


- **TypeScript**: Type-safe JavaScript


- **Tailwind CSS**: Utility-first CSS framework


- **Radix UI**: Accessible component primitives


### Backend Services

- **Supabase**: Backend-as-a-Service
  - PostgreSQL database with real-time subscriptions
  - Row Level Security (RLS) for data isolation
  - Built-in authentication with JWT tokens
  - Automatic API generation
  - File storage capabilities

- **OpenAI API**: AI/ML Services
  - GPT models for chat completion
  - text-embedding-ada-002 for document embeddings
  - Context-aware responses

- **Qdrant**: Vector Database
  - High-performance vector similarity search
  - Filtering capabilities
  - Scalable architecture
  - REST API

## Authentication & Authorization

### Authentication Flow
1. **User Registration/Login**: Handled by Supabase Auth
2. **JWT Token Generation**: Automatic via Supabase
3. **Session Management**: Stored in HTTP-only cookies
4. **Token Refresh**: Automatic background refresh

### Authorization Layers

#### 1. Middleware Level (`middleware.ts`)

#### 2. API Route Level (`utils/auth-middleware.ts`)


#### 3. Database Level (RLS)


## Core Application Flows

### 1. Project Creation Flow

```
User Input → Validation → Database Insert → Template Assignment → Variable Initialization
```

**Detailed Process:**
1. User fills project form (`/protected/dashboard`)
2. Form validation (client + server-side)
3. API call to `/api/projects` (POST)
4. Database insertion with RLS enforcement
5. Template assignment based on project type
6. Variable initialization for assigned templates
7. Notification to assigned team members

**Code Path:**
```
components/ui/project-form.tsx → 
app/api/projects/route.ts → 
Database (projects table) → 
Real-time update via Supabase
```

### 2. Document Template Processing Flow

```
Template Upload → Variable Extraction → Storage → Assignment → Document Generation
```

**Detailed Process:**
1. Admin uploads DOCX template (`/protected/templates`)
2. Server processes file using `docxtemplater`
3. Variable extraction via regex parsing
4. Template metadata stored in database
5. File stored in Supabase Storage
6. Template becomes available for project assignment
7. Document generation uses template + project variables

**Code Path:**
```
components/ui/template-upload-form.tsx → 
app/api/templates/route.ts → 
utils/template-parser.ts → 
Database + File Storage
```

### 3. User Management Flow

```
User Registration → Company Assignment → Role Assignment → Authorization → Access Control
```

**Detailed Process:**
1. User registers via Supabase Auth
2. Database trigger creates user profile
3. Company admin assigns user to company
4. Role assignment (USER, PROJECT_MANAGER, COMPANY_ADMIN, ADMIN)
5. Authorization flag set to `true`
6. User gains access based on role permissions

**Code Path:**
```
app/(auth-pages)/sign-up/page.tsx → 
Supabase Auth → 
Database trigger (handle_new_user) → 
Manual approval by company admin
```

### 4. AI Chat Flow

```
User Query → Context Gathering → Embedding → Vector Search → AI Response → Source Attribution
```

**Detailed Process:**
1. User submits query in semantic engine
2. System determines if query is project-related
3. Gather project context if applicable
4. Generate query embedding via OpenAI
5. Search Qdrant for similar documents
6. Combine context (project data + documents)
7. Send to OpenAI with system prompt
8. Return response with source attributions
9. Store conversation in database

**Code Path:**
```
app/protected/semantic-engine/page.tsx → 
app/api/semantic/chat/route.ts → 
lib/services/openai-client.ts + lib/services/qdrant-client.ts → 
Database (chat_sessions, chat_messages)
```

## AI & Semantic Search

### Architecture Overview
The AI system combines multiple components for intelligent document search and chat:

```
User Query → Project Context → Document Search → AI Response
     ↓              ↓              ↓              ↓
Query Analysis → Context Gathering → Vector Search → Response Generation
```

### Components

#### 1. OpenAI Integration (`lib/services/openai-client.ts`)
```typescript
class OpenAIService {
  // Generate embeddings for document chunks
  async generateEmbedding(text: string): Promise<number[]>
  
  // Generate chat responses with context
  async generateChatResponse(messages: ChatMessage[]): Promise<Response>
  
  // Estimate API costs
  estimateCost(tokens: number, type: 'embedding' | 'chat'): number
}
```

#### 2. Qdrant Vector Database (`lib/services/qdrant-client.ts`)
```typescript
class QdrantService {
  // Store document embeddings
  async upsertDocumentChunks(documentId: string, chunks: Chunk[]): Promise<string[]>
  
  // Search for similar documents
  async searchSimilar(query: string, embedding: number[], companyId: string): Promise<SourceAttribution[]>
  
  // Manage collections and indexes
  async ensureCollection(): Promise<void>
}
```

#### 3. Project Context Service (`lib/services/project-context.ts`)
```typescript
class ProjectContextService {
  // Determine if query is project-related
  static isProjectQuery(query: string): boolean
  
  // Gather relevant project data
  async getProjectContext(user: User): Promise<ProjectContext>
  
  // Format context for AI consumption
  static formatContextForAI(context: ProjectContext, user: User): string
}
```

### Document Processing Pipeline

#### Current State (Legacy FastAPI)
```
Document Upload → FastAPI → LlamaIndex → Chunking → Embedding → Qdrant Storage
```

#### Target State (Next.js)
```
Document Upload → Next.js API → Custom Chunking → OpenAI Embedding → Qdrant Storage
```

### BR18 Integration
The system includes Danish building regulations (BR18) as a knowledge base:

1. **BR18 Scraping**: Python script extracts regulation text
2. **Content Processing**: Text chunking and cleaning
3. **Embedding Generation**: Create vector representations
4. **Storage**: Store in Qdrant with metadata
5. **Search Integration**: Include in semantic search results

## File Structure

```
aticon-test-app/
├── app/                          # Next.js App Router
│   ├── (auth-pages)/            # Authentication pages
│   ├── api/                     # API routes
│   │   ├── admin/              # Admin-only endpoints
│   │   ├── chat/               # Legacy chat endpoints (proxy to FastAPI)
│   │   ├── companies/          # Company management
│   │   ├── projects/           # Project CRUD operations
│   │   ├── semantic/           # New AI chat endpoint
│   │   ├── templates/          # Template management
│   │   └── users/              # User management
│   ├── protected/              # Protected application pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── semantic-engine/    # AI chat interface
│   │   ├── templates/          # Template management
│   │   └── profile/            # User profile
│   └── globals.css             # Global styles
├── components/                  # React components
│   ├── ui/                     # UI components (forms, dialogs, etc.)
│   ├── semantic/               # AI chat components
│   └── auth/                   # Authentication components
├── lib/                        # Utility libraries
│   ├── services/               # External service integrations
│   ├── config/                 # Configuration files
│   └── types.ts                # TypeScript type definitions
├── utils/                      # Utility functions
│   ├── supabase/               # Supabase client configurations
│   ├── auth-middleware.ts      # Authentication middleware
│   └── tenant-isolation.ts     # Multi-tenant utilities
├── backend/                    # Legacy FastAPI backend
│   ├── index.py               # Main FastAPI application
│   ├── br18.py                # BR18 processing
│   └── pyproject.toml         # Python dependencies
└── supabase/                   # Database migrations and config
    └── migrations/             # SQL migration files
```

## API Design

### REST API Conventions
- **GET**: Retrieve data
- **POST**: Create new resources
- **PATCH**: Update existing resources
- **DELETE**: Remove resources

### API Route Structure
```
/api/
├── admin/                    # Admin-only operations
├── companies/               # Company management
├── projects/                # Project CRUD
│   ├── [id]/               # Individual project operations
│   │   ├── assignments/    # Project assignments
│   │   ├── variables/      # Project variables
│   │   └── download/       # Document download
├── templates/               # Template management
├── users/                   # User management
└── semantic/                # AI chat system
    └── chat/               # Chat endpoint
```

### Authentication Patterns
```typescript
// Public route (no authentication required)
export async function GET(request: Request) { ... }

// Authenticated route
export const GET = withAuth(async (request: AuthenticatedRequest) => { ... });

// Role-based route
export const POST = withCompanyAdmin(async (request: AuthenticatedRequest) => { ... });
```

### Error Handling
```typescript
// Standardized error responses
return NextResponse.json(
  { error: 'Resource not found', code: 'NOT_FOUND' },
  { status: 404 }
);
```


## Development Workflow

### Local Development Setup
```bash
# 1. Clone and install dependencies
git clone <repository>
cd aticon-test-app
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# 3. Set up database
npx supabase start
npx supabase db push

# 4. Start development server
npm run dev
```

### Branch Strategy
- **main**: Production-ready code
- **dev**: Development integration branch
- **feature/***: Individual feature branches
- **hotfix/***: Production hotfixes

## Deployment

### Production Architecture
```
Internet → Load Balancer → Next.js App → External Services
                                    ├── Supabase (Database)
                                    ├── OpenAI (AI)
                                    ├── Qdrant Cloud (Vector DB)
```

### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=<production-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-key>
OPENAI_API_KEY=<openai-key>
QDRANT_URL=<qdrant-cloud-url>
QDRANT_API_KEY=<qdrant-api-key>
```

---

## Getting Started for New Developers

### 1. Understanding the Codebase
1. Read this technical overview
2. Review the main README.md
3. Examine the database schema in `supabase/migrations/`
4. Study the API routes in `app/api/`
5. Understand the component structure in `components/`

### 2. Development Environment
1. Set up local development following the setup guide
2. Get access to development Supabase project
3. Obtain API keys for OpenAI and Qdrant
4. Run the application locally and explore features

### 3. Key Files to Understand
- `middleware.ts`: Request routing and authentication
- `app/api/`: API route implementations
