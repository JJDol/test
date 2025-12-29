# Aticon Management Tool - Feature Guide

## Table of Contents
1. [Project Management System](#project-management-system)
2. [Document Template Engine](#document-template-engine)
3. [AI-Powered Semantic Search](#ai-powered-semantic-search)
4. [Team Collaboration & Multi-Tenancy](#team-collaboration--multi-tenancy)
5. [Subscription Management](#subscription-management)
6. [File Storage & Document Processing](#file-storage--document-processing)
7. [Authentication & Security](#authentication--security)

---

## Project Management System

### Overview
A comprehensive project management system tailored for architecture and construction professionals, featuring template-based workflows, team collaboration, and progress tracking.

### Key Features

#### 1. Project Creation & Management
- **Project Dashboard**: Central hub showing all projects with filterable views
- **Project Stages**: TODO → IN_PROGRESS → REVIEW → DONE
- **Progress Tracking**: Automatic calculation based on template completion
- **Deadline Management**: Visual indicators for overdue projects
- **Archive System**: Organize completed projects

#### 3. Template-Based Workflows
- **Template Categories**: Architecture, Constructions, Fire Safety, Authority Processing, Energy, HVAC, Execution Control
- **Template Assignment**: Assign specific templates to projects
- **Variable Management**: Populate template variables per project
- **Document Generation**: Batch generate documents with populated variables

#### 4. Team Collaboration Features
- **Project Leaders**: Assign project leaders with management permissions
- **Team Members**: Add multiple workers to projects
- **Document Assignments**: Assign specific documents to team members
- **Supervision Workflow**: Designate supervisors for document review
- **Progress Monitoring**: Track individual and team progress

#### 5. Visual Project Management
- **Kanban Board**: Drag-and-drop project stage management
- **Progress Indicators**: Visual progress bars and completion percentages
- **Dashboard Analytics**: Project counts, active/overdue indicators
- **Real-time Updates**: Live updates via Supabase real-time subscriptions

### How It Works

#### Project Creation Flow
1. **User Authentication**: Role-based access (PROJECT_MANAGER or above)
2. **Form Submission**: Project details (name, location, deadline, leader)
3. **Template Selection**: Choose relevant templates for the project
4. **Database Creation**: Project record with company isolation
5. **Variable Initialization**: Set up template variables structure
6. **Team Notification**: Notify assigned team members

#### Document Workflow
1. **Template Assignment**: Assign templates to projects
2. **Variable Population**: Fill in project-specific variables
3. **Document Assignment**: Assign documents to team members
4. **Supervision Setup**: Designate supervisors for review
5. **Progress Tracking**: Monitor completion status
6. **Document Generation**: Create final documents with all variables

---

## Document Template Engine

### Overview
A sophisticated document processing engine that handles DOCX templates with variable extraction, population, and batch generation capabilities.

### Key Features

#### 1. Template Processing
- **DOCX Support**: Full Microsoft Word document support
- **Variable Extraction**: Automatic detection of template variables
- **Multiple Formats**: Support for Content Controls and curly brackets `{{variable}}`
- **Type Detection**: Detect variable types (text, image, date, number, etc.)
- **Template Validation**: Verify template structure and variables

#### 3. Variable Management
- **General Variables**: Shared across multiple templates
- **Template-Specific Variables**: Unique to individual templates
- **Variable Propagation**: Control how variables are shared
- **Type Validation**: Ensure correct data types
- **Default Values**: Set fallback values for missing variables

#### 4. Document Generation
- **Batch Processing**: Generate multiple documents simultaneously
- **ZIP Download**: Package all documents for easy distribution
- **Variable Substitution**: Replace placeholders with actual values
- **Image Handling**: Support for image insertion in documents
- **Error Handling**: Graceful handling of missing variables

### How It Works

#### Template Upload Process
1. **File Upload**: Upload DOCX template file
2. **Variable Extraction**: Parse document for variables
3. **Type Detection**: Identify variable types automatically
4. **Storage**: Save template and metadata to database
5. **Validation**: Verify template structure and variables

#### Document Generation Process
1. **Template Selection**: Choose templates for generation
2. **Variable Collection**: Gather all required variables
3. **Value Substitution**: Replace placeholders with actual values
4. **Document Processing**: Generate final documents
5. **Packaging**: Create ZIP file with all documents
6. **Download**: Provide download link to user


## AI-Powered Semantic Search

### Overview
Advanced AI chatbot system that provides semantic search through documents and Danish building regulations (BR18) with context-aware responses.

### Key Features

#### 1. Semantic Search Engine
- **Two-Stage Retrieval**: Initial broad search → refined results
- **Vector Database**: Qdrant for high-performance similarity search
- **Context-Aware Prompting**: Tailored responses based on query type
- **Source Attribution**: Track and cite source documents

#### 2. BR18 Integration
- **Danish Building Regulations**: Complete BR18 knowledge base
- **Regulation Parsing**: Extract specific regulation sections
- **Active Content Filtering**: Hide repealed or inactive regulations
- **Section References**: Direct links to specific BR18 sections
- **Multi-language Support**: Danish content with English responses

#### 3. Project Context Integration
- **Project Data Awareness**: Understand current project context
- **Query Classification**: Differentiate between project and regulation queries
- **Contextual Responses**: Provide relevant project-specific information
- **Data Isolation**: Maintain company-specific data boundaries

#### 4. Chat System
- **Session Management**: Persistent chat sessions
- **Message History**: Store conversation history
- **Real-time Responses**: Fast response generation
- **Source Citations**: Link to relevant documents and regulations


#### Enhanced Query Engine
- **Stage 1**: Cast wide net with 15-20 initial results
- **Stage 2**: Filter and rank to top 3-5 most relevant
- **Context Building**: Combine project data with document content
- **Prompt Engineering**: Optimize prompts for different query types
- **Response Optimization**: Balance quality with cost

#### BR18 Processing Pipeline
1. **Content Extraction**: Scrape and process BR18 regulations
2. **Text Chunking**: Split into manageable segments
3. **Fact Extraction**: Extract key regulatory facts
4. **Question Generation**: Create searchable questions
5. **Vector Storage**: Store in Qdrant with metadata
6. **Search Integration**: Enable semantic search across regulations

---

## Team Collaboration & Multi-Tenancy

### Overview
Comprehensive multi-tenant architecture enabling secure collaboration within companies while maintaining complete data isolation.

### Key Features

#### 1. Multi-Tenant Architecture
- **Company Isolation**: Complete data segregation between companies
- **Automatic Bucket Creation**: Per-company storage buckets
- **Row Level Security**: Database-level access control
- **JWT Authentication**: Zero-DB-call authentication with company metadata

#### 2. Role-Based Access Control
```typescript
enum UserRole {
  ADMIN = 'ADMIN',           // System administrator
  COMPANY_ADMIN = 'COMPANY_ADMIN',  // Company administrator
  PROJECT_MANAGER = 'PROJECT_MANAGER',  // Project manager
  USER = 'USER'              // Regular user
}
```

#### 4. Team Management
- **User Onboarding**: Company admin approval process
- **Team Assignment**: Assign users to projects
- **Role Management**: Promote/demote users within company
- **Access Control**: Granular permissions per feature



#### Company Management
- **Company Creation**: Automatic storage bucket setup
- **User Management**: Company admins manage team members
- **Subscription Management**: Per-company billing and limits
- **Data Isolation**: Complete segregation between companies

---

## File Storage & Document Processing

### Overview
Sophisticated file storage system with automatic bucket creation, multi-format support, and secure access controls.

### Storage Architecture

#### 1. Automatic Bucket Creation
- **Per-Company Buckets**: Isolated storage per company
- **Public/Private Buckets**: Separate buckets for different access levels
- **Automatic Setup**: Buckets created on company creation
- **Consistent Configuration**: Same settings across all companies

#### 3. Multi-Format Support (not implemented yet)
- **DOCX**: Microsoft Word documents
- **PDF**: Portable Document Format
- **Images**: JPEG, PNG, GIF
- **Text**: Plain text and Markdown

### Document Processing Engine

#### 1. Template Processing
- **Variable Extraction**: Automatic detection from DOCX files
- **Content Controls**: Support for Word content controls
- **Type Detection**: Automatic variable type identification

#### 2. Image Processing
- **Image Insertion**: Support for image variables in templates
- **Format Conversion**: Automatic format optimization
- **Size Optimization**: Compress images for storage efficiency
- **Secure Access**: Controlled access to uploaded images

#### 3. Batch Processing
- **Multiple Documents**: Process multiple templates simultaneously
- **ZIP Generation**: Package results for download
- **Progress Tracking**: Monitor processing status
- **Error Handling**: Graceful error management

## Authentication & Security

### Overview
Enterprise-grade security system with JWT-based authentication, multi-tenant isolation, and comprehensive access controls.

### Security Features

#### 1. JWT-Based Authentication
- **Zero Database Calls**: Authentication data stored in JWT metadata
- **Company Isolation**: Company ID embedded in JWT
- **Role-Based Access**: User roles in JWT for instant authorization
- **Token Refresh**: Automatic token refresh on role changes

#### 2. Multi-Tenant Security
- **Row Level Security**: Database-level access control
- **Company Boundaries**: Automatic data isolation
- **API Security**: All 25+ API routes secured
- **File Access Control**: Company-specific file access

#### 3. Access Control Matrix
```typescript
// Route-level security
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  // All authenticated users
});

export const POST = withCompanyAdmin(async (request: AuthenticatedRequest) => {
  // Company admin or above only
});

export const DELETE = withAdmin(async (request: AuthenticatedRequest) => {
  // System admin only
});
```

#### 4. API Security
- **Authentication Required**: All protected routes require valid JWT
- **Role-Based Access**: Granular permissions per endpoint
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: (Planned) Request rate limiting per user/company

### Security Implementation


### Security Best Practices

#### 1. Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **Input Sanitization**: Comprehensive input validation
- **SQL Injection Prevention**: Parameterized queries and RLS
- **XSS Protection**: Content Security Policy and input encoding

#### 2. Access Control
- **Principle of Least Privilege**: Minimal required permissions
- **Role-Based Access**: Granular role definitions
- **Multi-Factor Authentication**: (Planned) Additional security layer
- **Audit Logging**: (Planned) Comprehensive audit trails

#### 3. File Security
- **Type Validation**: Strict file type checking
- **Size Limits**: Prevent abuse with size restrictions
- **Content Validation**: Scan for malicious content
- **Secure Storage**: Isolated storage per company

---