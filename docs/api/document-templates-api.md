# Document Templates API Documentation

## Overview

The Document Templates API provides comprehensive functionality for managing document templates in the construction project management system. This API handles template creation, storage, variable extraction, and management with support for both direct file uploads and blob-based storage.

## Current Structure

```
/api/document-templates/
├── route.ts                           # Main CRUD operations (GET, POST, PUT, DELETE)
├── [name]/
│   ├── route.ts                       # Individual template operations (GET, DELETE)
│   └── assign/                        # Template assignment (BROKEN - needs rewrite)
├── check-duplicates/                  # Duplicate checking for uploads
├── extract-variables/                 # Variable extraction from files
├── extract-variables-blob/            # Blob-based variable extraction
└── process-blob/                      # Blob file processing
```

## Route Analysis

### `/api/document-templates/` - Main Template Management

**Purpose:** Core CRUD operations for document templates
- **GET:** Retrieve templates with filtering (category, public/private)
- **POST:** Create new templates (supports both file upload and blob URLs)
- **PUT:** Update existing template metadata
- **DELETE:** Remove templates and clean up storage

**Key Features:**
- Multi-tenant template management
- Support for both direct file uploads and Vercel Blob storage
- Variable extraction and storage
- Category-based organization
- Public/private template access control

**Security:**
- Authentication required via `withAuth` middleware
- Company isolation enforced
- File type validation (.docx only)
- File size limits (50MB max)

**Current Issues:**
- Mixed file handling (direct upload + blob)
- Legacy variable format support
- RLS dependency for access control
- Inconsistent error handling

### `/api/document-templates/[name]/` - Individual Template Operations

**Purpose:** Handle operations for specific templates by name
- **GET:** Download template file with access control
- **DELETE:** Remove template and clean up project references

**Key Features:**
- Template download with proper file serving
- Comprehensive cleanup when deleting templates
- Project reference cleanup across all template categories
- Document assignment and variable cleanup

**Security:**
- Authentication required via `withAuthDynamic` middleware
- Company isolation enforced for template access
- Template ownership validation for deletion
- Public templates accessible to all company users

### `/api/document-templates/check-duplicates/` - Duplicate Validation

**Purpose:** Check for naming and file conflicts during template uploads
- **GET:** Validate template name uniqueness and filename conflicts

**Key Features:**
- Template name conflict detection
- Filename conflict checking in storage paths
- Support for both personal and public templates
- Sanitization of template names and filenames

**Security:**
- Authentication required via `withAuth` middleware
- Company isolation enforced for template validation
- Users can only check conflicts within their scope

### `/api/document-templates/extract-variables/` - Variable Extraction

**Purpose:** Extract variables and content controls from uploaded templates
- **POST:** Process .docx files to identify template variables

**Key Features:**
- Enhanced variable type detection (text, date, dropdown, checkbox, etc.)
- Comprehensive variable metadata extraction
- Large file processing support (60-second timeout)
- Backward compatibility with existing variable formats

**Security:**
- Authentication required via `withAuth` middleware
- File type validation (.docx only)
- File size limits (50MB max)
- Input sanitization and validation

### `/api/document-templates/extract-variables-blob/` - Blob Upload Handling

**Purpose:** Handle blob-based file uploads for variable extraction
- **POST:** Process file uploads through Vercel Blob storage

**Key Features:**
- Vercel Blob integration for scalable file storage
- Secure upload token generation with user context
- File type and path validation
- Large file processing support

**Security:**
- Authentication required via `withAuth` middleware
- File type validation (.docx files only)
- Upload path validation (temp-uploads/ prefix required)
- File size limits (50MB max)

### `/api/document-templates/process-blob/` - Blob File Processing

**Purpose:** Process uploaded blob files to extract template variables
- **POST:** Download and process files from Vercel Blob storage

**Key Features:**
- Downloads files from Vercel Blob using provided URLs
- Variable extraction from blob data
- File integrity and size validation
- Processing metadata and results

**Security:**
- Authentication required via `withAuth` middleware
- File type validation (.docx files only)
- File size limits (50MB max)
- Blob URL validation and secure file download

## Analysis & Recommendations

### 🔍 Current State Analysis

#### Strengths:
1. **Comprehensive Coverage:** Handles all aspects of template management
2. **Flexible Storage:** Supports both direct uploads and blob storage
3. **Variable Extraction:** Advanced variable detection and typing
4. **Multi-tenancy:** Proper company isolation and access control
5. **Cleanup Logic:** Comprehensive project reference cleanup

#### Issues Identified:
1. **Mixed File Handling:** Inconsistent approach to file uploads
2. **Legacy Support:** Maintaining backward compatibility adds complexity
3. **RLS Dependency:** Over-reliance on database-level access control
4. **Error Handling:** Inconsistent error response formats
5. **Code Duplication:** Similar logic repeated across routes

### 🎯 Recommended Improvements

#### Phase 1: Immediate Fixes
1. **Standardize File Handling**
   - Choose between direct uploads or blob storage (recommend blob)
   - Remove mixed approach for consistency
   - Update frontend to use single method

2. **Remove Legacy Support**
   - Eliminate legacy variable format handling
   - Update all frontend calls to use new format
   - Clean up deprecated code paths

3. **Fix Broken Assignment Route**
   - Rewrite `/assign` route or remove entirely
   - Implement proper template sharing/assignment logic
   - Consider if assignment concept fits template model

#### Phase 2: Structural Improvements
1. **Consolidate Variable Extraction**
   - Merge `extract-variables` and `extract-variables-blob` if possible
   - Standardize on single extraction method
   - Move extraction logic to service layer

2. **Improve Error Handling**
   - Standardize error response formats
   - Add proper error logging and monitoring
   - Implement consistent validation patterns

3. **Enhance Security**
   - Add file content validation for malicious content
   - Implement upload rate limiting
   - Add audit logging for template operations

#### Phase 3: Advanced Features
1. **Template Versioning**
   - Add version control for templates
   - Track template changes and updates
   - Support template rollback

2. **Performance Optimization**
   - Implement template caching
   - Add file processing queuing
   - Optimize variable extraction algorithms

3. **Analytics & Monitoring**
   - Track template usage and popularity
   - Monitor processing performance
   - Add usage analytics dashboard

## TODOs and Action Items

### 🔥 High Priority

#### 1. Standardize File Handling Strategy
**Issue:** Mixed approach to file uploads (direct + blob)
**Action:** 
- Decide on single file handling method
- Remove mixed approach code
- Update frontend to use consistent method
- Consider migrating to full blob-based system

#### 2. Remove Legacy Variable Support
**Issue:** Maintaining backward compatibility adds complexity
**Action:**
- Identify all frontend usage of legacy format
- Update frontend to use new variable format
- Remove legacy variable handling code
- Clean up deprecated endpoints

#### 3. Fix Assignment Route
**Issue:** `/assign` route is completely broken
**Action:**
- Determine if assignment concept fits template model
- Rewrite route or remove entirely
- Implement proper template sharing if needed
- Update related frontend functionality

### 🟡 Medium Priority

#### 4. Consolidate Variable Extraction
**Issue:** Multiple routes for similar functionality
**Action:**
- Evaluate if routes can be merged
- Standardize extraction logic
- Move common functionality to service layer
- Reduce code duplication

#### 5. Improve Error Handling
**Issue:** Inconsistent error response formats
**Action:**
- Standardize error response structure
- Add proper error logging
- Implement consistent validation
- Add error monitoring

#### 6. Enhance Security
**Issue:** Limited file content validation
**Action:**
- Add malicious content detection
- Implement upload rate limiting
- Add audit logging
- Enhance access control

### 🟢 Low Priority

#### 7. Performance Optimization
**Issue:** No caching or queuing system
**Action:**
- Implement template caching
- Add file processing queue
- Optimize extraction algorithms
- Add performance monitoring

#### 8. Advanced Features
**Issue:** Missing modern template management features
**Action:**
- Add template versioning
- Implement template analytics
- Add template sharing/collaboration
- Consider template marketplace

## Conclusion

The Document Templates API provides a solid foundation for template management but needs consolidation and modernization. The main priorities are:

1. **Standardize file handling** to use a single approach
2. **Remove legacy code** to reduce complexity
3. **Fix broken functionality** for production readiness
4. **Improve consistency** across all routes
5. **Enhance security** and error handling

The API has good architectural foundations with proper multi-tenancy, authentication, and comprehensive functionality. With the recommended improvements, it can become a robust, maintainable system for template management.
