# Debug API Routes

## Overview

The debug routes provide development and troubleshooting tools for the application. These routes help developers understand system behavior, test functionality, and diagnose issues during development.

**⚠️ IMPORTANT**: These routes should be **disabled in production** for security reasons.

## Routes Summary

| Route | Purpose | Authentication | Status |
|-------|---------|----------------|--------|
| `/api/debug/user-info` | Test user authentication and tenant isolation | Admin Only | Development |
| `/api/debug/functions` | Test database helper functions | Admin Only | Development |
| `/api/debug/leaders` | Debug project leadership assignments | Admin Only | Development |
| `/api/debug/test-content-controls` | Test content control processing | Admin Only | Development |
| `/api/debug/collections` | Inspect Qdrant vector database collections | Admin Only | Development |
| `/api/debug/analyze-document` | Analyze document structure | Admin Only | Development |

## Detailed Route Documentation

### 1. User Info Debug (`/api/debug/user-info`)

**Purpose**: Test user authentication and tenant isolation

**Endpoint**: `GET /api/debug/user-info`

**Response**:
```json
{
  "jwt_user_data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "COMPANY_ADMIN",
    "company_id": "company-uuid"
  },
  "projects_returned": [
    {
      "id": "project-uuid",
      "name": "Project Name",
      "company_id": "company-uuid"
    }
  ],
  "projects_count": 5,
  "query_error": null
}
```

**Use Cases**:
- Verify JWT token contains correct user data
- Test tenant isolation (users only see their company's projects)
- Debug authentication middleware
- Check database connection and RLS policies

### 2. Functions Debug (`/api/debug/functions`)

**Purpose**: Test database helper functions and role checking

**Endpoint**: `GET /api/debug/functions`

**Response**:
```json
{
  "jwt_user_data": {
    "id": "user-uuid",
    "company_id": "company-uuid",
    "role": "COMPANY_ADMIN"
  },
  "function_results": {
    "get_current_user_company_id": "company-uuid",
    "check_if_admin": false,
    "check_if_company_admin": true,
    "check_if_project_manager": false
  },
  "explicit_filtered_projects": [...],
  "explicit_filter_error": null
}
```

**Use Cases**:
- Test database RPC functions
- Verify role-based access control
- Debug tenant isolation functions
- Compare JWT data vs database queries

### 3. Leaders Debug (`/api/debug/leaders`)

**Purpose**: Debug project leadership assignments and user roles

**Endpoint**: `GET /api/debug/leaders`

**Response**:
```json
{
  "jwt_user_data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "COMPANY_ADMIN",
    "company_id": "company-uuid"
  },
  "database_user_data": {
    "id": "user-uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "COMPANY_ADMIN"
  },
  "my_leader_projects": [...],
  "copenhagen_project": {...},
  "copenhagen_leader": {...},
  "id_match": true
}
```

**Use Cases**:
- Debug project leadership assignments
- Verify user role consistency between JWT and database
- Test specific project queries
- Check leader-project relationships

### 4. Content Controls Test (`/api/debug/test-content-controls`)

**Purpose**: Test content control processing functionality

**Endpoint**: `GET /api/debug/test-content-controls`

**Response**:
```json
{
  "success": true,
  "message": "Content control processing test completed",
  "details": {...},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Use Cases**:
- Test content control processing logic
- Verify document analysis functions
- Debug content filtering rules
- Validate processing pipeline

### 5. Collections Debug (`/api/debug/collections`)

**Purpose**: Inspect Qdrant vector database collections

**Endpoint**: `GET /api/debug/collections`

**Response**:
```json
{
  "success": true,
  "configured_collection": "company-documents",
  "available_collections": [
    {
      "name": "company-documents",
      "points_count": 1250,
      "config": {...},
      "sample_points": [
        {
          "id": "point-uuid",
          "payload_keys": ["company_id", "source_type", "document_id", "text"],
          "sample_payload": {
            "company_id": "company-uuid",
            "source_type": "document",
            "document_id": "doc-uuid",
            "text_preview": "Sample text content..."
          }
        }
      ]
    }
  ]
}
```

**Use Cases**:
- Inspect vector database collections
- Verify document embeddings are stored correctly
- Debug search functionality
- Check data structure and content

### 6. Document Analysis (`/api/debug/analyze-document`)

**Purpose**: Analyze document structure and content

**Endpoints**:
- `GET /api/debug/analyze-document?file=filename.docx`
- `POST /api/debug/analyze-document` (with file upload)

**Response**:
```json
{
  "success": true,
  "fileName": "Test_big_file.docx",
  "fileSize": 1024000,
  "analysis": {
    "structure": {...},
    "content": {...},
    "metadata": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Use Cases**:
- Test document parsing and analysis
- Debug content extraction
- Verify document structure detection
- Test file upload and processing

## Security Considerations

### Development Only
- These routes should be **disabled in production**
- Use environment variables to control access
- Consider IP whitelisting for development

### Authentication
- **All routes require Admin role** for security
- No unauthenticated access to debug routes
- Admin-only access prevents unauthorized debugging

### Data Exposure
- Debug routes may expose sensitive information
- Use only in development environment
- Consider data sanitization for sensitive fields

## Implementation Notes

### Environment Control
```typescript
// All debug routes now include production checks
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Debug routes disabled in production' }, { status: 404 });
}
```

**Security Features Implemented:**
- ✅ **Production disabled**: All routes return 404 in production
- ✅ **Admin only**: All routes require admin role
- ✅ **Environment aware**: Automatic detection of production environment

### Error Handling
- All routes include comprehensive error handling
- Errors are logged for debugging
- User-friendly error messages are returned

### Performance
- Debug routes may be slow due to extensive logging
- Consider adding performance monitoring
- Limit data returned in production-like environments

## For Future Developers

### Adding New Debug Routes
1. Create route in `/app/api/debug/`
2. Add comprehensive error handling
3. Include authentication if needed
4. Document the route purpose and usage
5. Add to this documentation

### Production Deployment
- **Disable all debug routes in production**
- Use environment variables to control access
- Consider removing debug routes entirely for production builds

### Maintenance
- Review debug routes regularly
- Remove obsolete debug routes
- Update documentation as needed
- Test debug routes in development environment

## Related Files

- `utils/auth-middleware.ts` - Authentication middleware
- `utils/tenant-isolation.ts` - Tenant isolation utilities
- `utils/content-control-processor.ts` - Content processing
- `lib/services/qdrant-client.ts` - Vector database client
- `lib/config/ai-config.ts` - AI configuration
