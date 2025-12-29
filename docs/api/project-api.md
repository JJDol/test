# Project API Routes Documentation

## Overview

The Project API routes handle all project-related operations including project management, document generation, variable handling, and file management. All routes enforce multi-tenant company isolation and role-based access control.

## Route Structure

```
/api/projects/
├── route.ts                           # Collection operations (GET, POST)
└── [id]/
    ├── route.ts                       # Individual project operations (GET, PATCH)
    ├── variables/
    │   └── route.ts                   # Project variables (GET, POST)
    ├── general-variables/
    │   └── route.ts                   # General variables (POST)
    ├── assignments/
    │   └── route.ts                   # Document assignments (POST)
    ├── images/
    │   └── route.ts                   # Project images (POST, GET, DELETE)
    ├── clean-variables/
    │   └── route.ts                   # Variable cleanup (POST)
    ├── download/
    │   └── route.ts                   # Bulk document download (POST)
    ├── generate-document/
    │   └── route.ts                   # Single document generation (POST)
    └── generate-document-enhanced/
        └── route.ts                   # Legacy enhanced generation (POST) - TO BE DELETED
```

## Route Details

### `/api/projects` (Collection Operations)

**Purpose:** Manage construction projects at the collection level
- **GET:** List projects with role-based filtering
- **POST:** Create new projects with template assignments

**Security:**
- Authentication required
- Company isolation enforced
- Role-based access: ADMIN (all), COMPANY_ADMIN (company), MANAGER/USER (assigned only)

### `/api/projects/[id]` (Individual Project Operations)

**Purpose:** Manage individual projects by ID
- **GET:** Get project details with worker information
- **PATCH:** Update project settings and template assignments

**Security:**
- Authentication required
- Company isolation enforced
- ADMIN can access projects from any company

### `/api/projects/[id]/variables` (Project Variables)

**Purpose:** Manage template variables for individual projects
- **GET:** Get all project variables
- **POST:** Update variable values

**Security:**
- Authentication required
- Role-based access: ADMIN, COMPANY_ADMIN, project leader, or project worker

### `/api/projects/[id]/general-variables` (General Variables)

**Purpose:** Update general variables that propagate across all project templates
- **POST:** Update general variables

**Security:**
- Authentication required
- Company isolation enforced

### `/api/projects/[id]/assignments` (Document Assignments)

**Purpose:** Manage document assignments within projects
- **POST:** Update document assignments

**Security:**
- Authentication required
- Company isolation enforced (users can only assign within project's company)

### `/api/projects/[id]/images` (Project Images)

**Purpose:** Manage project-related images for document templates
- **POST:** Upload project image
- **GET:** Retrieve project image
- **DELETE:** Delete project image

**Security:**
- Authentication required
- Role-based access: ADMIN, COMPANY_ADMIN, project leader, or project worker
- File type validation (images only)

### `/api/projects/[id]/clean-variables` (Variable Cleanup)

**Purpose:** Clean and normalize project template variables
- **POST:** Clean project variables

**Security:**
- Authentication required
- ADMIN can access projects from any company

### `/api/projects/[id]/download` (Bulk Document Download)

**Purpose:** Generate and download all project documents as a ZIP
- **POST:** Download all project documents

**Security:**
- Authentication required
- Company isolation enforced

### `/api/projects/[id]/generate-document` (Single Document Generation)

**Purpose:** Generate and download a single document from a template
- **POST:** Generate single document

**Security:**
- Authentication required
- Company isolation enforced

## TODOs and Improvements

### 🔥 High Priority

#### 1. Extract Common Document Generation Logic
**Files:** `generate-document/route.ts`, `download/route.ts`
**Issue:** Significant code duplication between document generation routes
**Solution:**
- Create `utils/document-generation/` folder
- Extract template access control logic
- Extract variable processing logic
- Extract file response logic
- Create reusable utility functions

#### 2. Remove Legacy Route
**File:** `generate-document-enhanced/route.ts`
**Issue:** Legacy route with old patterns and inconsistencies
**Solution:**
- Extract useful variable type handling
- Extract project variable fallbacks
- Extract better error message structure
- Delete the route after extraction

#### 3. Fix URL Mismatch in Document Generation
**File:** `generate-document/route.ts`
**Issue:** URL generation uses different company ID than upload
**Solution:**
- Ensure consistent company ID usage throughout
- Use project's company ID for both upload and URL generation

### 🟡 Medium Priority

#### 4. Improve Error Handling Consistency
**Issue:** Inconsistent error messages across routes
**Solution:**
- Standardize error message format
- Create error utility functions
- Add proper error codes and messages

#### 5. Optimize Database Queries
**Issue:** Some routes have inefficient database queries
**Solution:**
- Review and optimize query patterns
- Add proper indexing recommendations
- Consider query batching where appropriate

#### 6. Add Input Validation
**Issue:** Limited input validation in some routes
**Solution:**
- Add comprehensive input validation
- Create validation utility functions
- Add sanitization for user inputs

### 🟢 Low Priority

#### 7. Add Rate Limiting
**Issue:** No rate limiting on document generation routes
**Solution:**
- Add rate limiting for expensive operations
- Consider different limits for different user roles
- Add rate limiting headers

#### 8. Improve Logging
**Issue:** Inconsistent logging across routes
**Solution:**
- Standardize logging format
- Add structured logging
- Add performance monitoring

#### 9. Add Caching
**Issue:** No caching for frequently accessed data
**Solution:**
- Add caching for project data
- Add caching for template data
- Consider Redis or similar for caching

## Security Considerations

### Multi-Tenancy
- All routes enforce company isolation
- Users can only access their company's data
- ADMIN role has special privileges but still respects company boundaries

### Role-Based Access Control
- **ADMIN:** Full access to all companies
- **COMPANY_ADMIN:** Full access within company
- **PROJECT_MANAGER:** Access to assigned projects
- **USER:** Access to assigned projects

### File Security
- File uploads validated for type and size
- Images stored in company-specific folders
- File access controlled by project permissions

### Input Validation
- All user inputs validated and sanitized
- SQL injection prevention through parameterized queries
- XSS prevention through proper output encoding

## Performance Considerations

### Database Optimization
- Use indexed queries where possible
- Minimize N+1 query problems
- Consider query optimization for large datasets

### File Operations
- Large file operations have timeout limits
- Parallel processing for bulk operations
- Efficient file storage and retrieval

### Caching Strategy
- Consider caching for frequently accessed data
- Implement proper cache invalidation
- Use appropriate cache TTL values

## Future Enhancements

### API Versioning
- Consider API versioning strategy
- Plan for backward compatibility
- Document breaking changes

### Monitoring and Analytics
- Add comprehensive monitoring
- Track API usage patterns
- Monitor performance metrics

### Documentation
- Add OpenAPI/Swagger documentation
- Create API usage examples
- Document rate limits and quotas
