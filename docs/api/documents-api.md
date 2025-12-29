# AI Documents API

## Overview

The Documents API manages document lifecycle in the construction project management system. It handles document creation, upload, processing, assignment, and integration with AI/vector search capabilities.

**Purpose**: Document management for construction projects with AI-powered search and processing

## API Structure

```
/app/api/ai-documents/
├── route.ts                    # Main document CRUD operations
├── upload/route.ts            # Document upload and processing
├── ingestion-status/route.ts  # Check document processing status
└── [id]/
    ├── route.ts               # Individual document operations
    └── assign/route.ts        # Document assignment management
```

## Routes Summary

| Route | Method | Purpose | Authentication |
|-------|--------|---------|----------------|
| `/api/ai-documents` | GET | List all documents (user + public) | Required |
| `/api/ai-documents` | POST | Create new document | Required |
| `/api/ai-documents/upload` | POST | Upload and process document | Required |
| `/api/ai-documents/ingestion-status` | POST | Check processing status | Required |
| `/api/ai-documents/[id]` | DELETE | Delete document | Required |
| `/api/ai-documents/[id]/assign` | PATCH | Assign document to users | Required |

## Detailed Route Documentation

### 1. Main AI Documents Route (`/api/ai-documents`)

**GET** - Retrieve all documents
- **User documents**: From `ai_documents` table (company-specific)
- **Public documents**: From Qdrant vector database (BR18, etc.)
- **Access control**: Company isolation + user permissions

**Response**:
```json
{
  "documents": [
    {
      "id": "uuid",
      "name": "Document Name",
      "size": 1024000,
      "type": "application/pdf",
      "company_id": "company-uuid",
      "user_id": "user-uuid",
      "is_company_wide": true,
      "description": "Document description",
      "tags": ["tag1", "tag2"],
      "ingestion_status": "completed",
      "ingestion_progress": 100,
      "chunks_count": 25,
      "uploaded_by_name": "User Name",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**POST** - Create new document
- **Purpose**: Create document metadata (not file upload)
- **Validation**: Required fields, enum values, project access
- **Multi-tenant**: Company isolation enforced

**Request**:
```json
{
  "project_id": "project-uuid",
  "name": "Document Name",
  "category": "ARCHITECTURE",
  "status": "NOT_STARTED",
  "description": "Optional description"
}
```

### 2. Document Upload (`/api/ai-documents/upload`)

**Purpose**: Upload and process documents for AI ingestion

**Features**:
- **File validation**: Type, size (50MB max)
- **Background processing**: Async document ingestion
- **Vector storage**: Automatic Qdrant integration
- **Progress tracking**: Real-time status updates

**Supported Formats**:
- PDF (`application/pdf`)
- Word documents (`.doc`, `.docx`)
- Text files (`.txt`, `.md`)

**Request** (FormData):
```
file: File
description: string (optional)
tags: string (comma-separated)
is_company_wide: boolean
```

**Response**:
```json
{
  "message": "Document uploaded successfully and queued for processing",
  "document": {
    "id": "uuid",
    "name": "filename.pdf",
    "size": 1024000,
    "ingestion_status": "pending"
  }
}
```

### 3. Ingestion Status (`/api/ai-documents/ingestion-status`)

**Purpose**: Check processing status of uploaded documents

**Request**:
```json
{
  "document_ids": ["uuid1", "uuid2"]
}
```

**Response**:
```json
{
  "statuses": [
    {
      "document_id": "uuid",
      "status": "completed",
      "progress": 100,
      "error": null
    }
  ]
}
```

**Status Values**:
- `pending`: Queued for processing
- `processing`: Currently being processed
- `completed`: Successfully processed
- `failed`: Processing failed
- `cancelled`: Processing cancelled

### 4. Individual Document Operations (`/api/ai-documents/[id]`)

**DELETE** - Remove document
- **Database**: Removes from `ai_documents` table
- **Vector storage**: Removes from Qdrant collection
- **Access control**: Company isolation enforced

### 5. Document Assignment (`/api/ai-documents/[id]/assign`)

**PATCH** - Assign document to users
- **Assignee**: User responsible for document
- **Supervisor**: User overseeing the work
- **Validation**: Users must be in same company

**Request**:
```json
{
  "assignee_id": "user-uuid",
  "supervisor_id": "user-uuid"
}
```

## Data Models

### Document Types
```typescript
enum DocumentCategory {
  ARCHITECTURE = 'ARCHITECTURE',
  CONSTRUCTION = 'CONSTRUCTION',
  FIRE_SAFETY = 'FIRE_SAFETY',
  AUTHORITY_PROCESSING = 'AUTHORITY_PROCESSING',
  ENERGY = 'ENERGY',
  HVAC = 'HVAC',
  EXECUTION_CONTROL = 'EXECUTION_CONTROL'
}

enum DocumentStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}
```

### Database Tables

**`ai_documents`** - User uploaded documents
```sql
CREATE TABLE ai_documents (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  size BIGINT,
  type TEXT,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  is_company_wide BOOLEAN DEFAULT false,
  description TEXT,
  tags TEXT[],
  ingestion_status TEXT DEFAULT 'pending',
  ingestion_progress INTEGER DEFAULT 0,
  ingestion_error TEXT,
  chunks_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**`documents`** - Project documents (legacy)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  category TEXT,
  status TEXT,
  assignee_id UUID REFERENCES users(id),
  supervisor_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## AI Integration

### Vector Database (Qdrant)
- **Purpose**: Store document embeddings for AI search
- **Collection**: `company-documents` (configurable)
- **Processing**: Automatic chunking and embedding
- **Search**: Semantic search across documents

### Document Processing Pipeline
1. **Upload**: File validation and metadata creation
2. **Chunking**: Split document into searchable chunks
3. **Embedding**: Generate vector embeddings
4. **Storage**: Store in Qdrant with metadata
5. **Indexing**: Create search indexes

### Public Documents
- **BR18**: Danish Building Regulations
- **Source**: Static content, system-managed
- **Access**: Available to all users
- **Storage**: Qdrant vector database

## Security Features

### Multi-tenancy
- **Company isolation**: Users only see their company's documents
- **RLS policies**: Database-level access control
- **Cross-company protection**: Prevents data leakage

### Access Control
- **Authentication**: All routes require valid JWT
- **Authorization**: Role-based access control
- **File validation**: Type and size restrictions
- **Input sanitization**: Prevent injection attacks

### Data Protection
- **Secure uploads**: File type validation
- **Size limits**: Prevent abuse (50MB max)
- **Error handling**: No sensitive data exposure
- **Audit trail**: Track uploads and changes

## Use Cases

### 1. Document Management
- Upload construction documents
- Organize by project and category
- Track document status and progress
- Assign responsibility to team members

### 2. AI-Powered Search
- Semantic search across documents
- Find relevant information quickly
- Cross-reference between documents
- Access to building regulations

### 3. Project Collaboration
- Share documents within company
- Assign tasks and responsibilities
- Track document review process
- Maintain audit trail

### 4. Compliance
- Store regulatory documents
- Track approval workflows
- Maintain document history
- Ensure data retention

## Error Handling

### Common Error Responses
```json
// Validation Error
{
  "message": "Missing required fields",
  "details": {
    "project_id": true,
    "name": false
  }
}

// Access Error
{
  "message": "Document not found or not accessible in your company"
}

// Processing Error
{
  "message": "Failed to process document",
  "details": "File format not supported"
}
```

### Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation)
- **401**: Unauthorized
- **403**: Forbidden (access denied)
- **404**: Not Found
- **500**: Internal Server Error

## Performance Considerations

### Optimization
- **Background processing**: Non-blocking uploads
- **Chunking**: Efficient document splitting
- **Caching**: Vector search optimization
- **Pagination**: Large result sets

### Monitoring
- **Processing status**: Real-time progress tracking
- **Error logging**: Comprehensive error capture
- **Performance metrics**: Upload and processing times
- **Storage usage**: Document and vector storage

## For Future Developers

### Adding New Document Types
1. Update `DocumentCategory` enum
2. Add validation in upload route
3. Update processing pipeline
4. Test with sample documents

### Extending AI Features
1. Modify embedding generation
2. Update search algorithms
3. Add new vector collections
4. Implement advanced filtering

### Performance Improvements
1. Implement document caching
2. Optimize vector search
3. Add batch processing
4. Implement compression

### Security Enhancements
1. Add file scanning
2. Implement encryption
3. Add access logging
4. Enhance audit trails
