# Project Templates API Documentation

## Overview

The Project Templates API manages reusable project configurations for construction projects. Templates define document categories and structure, enabling standardization and efficiency in project setup across companies.

## Routes

### Collection Routes (`/api/project-templates`)

#### GET `/api/project-templates`
- **Purpose**: List all project templates for the authenticated user's company
- **Authentication**: Required via `withAuthDynamic` middleware
- **Response**: Array of template objects
- **Access Control**: Company-scoped (users only see their company's templates)

#### POST `/api/project-templates`
- **Purpose**: Create a new project template
- **Authentication**: Required via `withAuthDynamic` middleware
- **Body**: `{ name: string, templates?: string[], category: DocumentCategory }`
- **Validation**: Name and category are required
- **Duplicate Prevention**: Template names must be unique within company

### Individual Routes (`/api/project-templates/[name]`)

#### GET `/api/project-templates/[name]`
- **Purpose**: Get a specific project template by name
- **Authentication**: Required via `withAuthDynamic` middleware
- **Access Control**: Company-scoped template access

#### PATCH `/api/project-templates/[name]`
- **Purpose**: Update an existing project template
- **Authentication**: Required via `withAuthDynamic` middleware
- **Body**: Partial update object with optional fields
- **Validation**: Name changes trigger uniqueness validation

#### DELETE `/api/project-templates/[name]`
- **Purpose**: Delete a project template
- **Authentication**: Required via `withAuthDynamic` middleware
- **Permanence**: Hard delete (no soft delete currently)

## Security Features

- **Authentication**: All routes require authentication via `withAuthDynamic` middleware
- **Company Isolation**: All operations are scoped to the user's company
- **Input Validation**: Required fields validation and duplicate name prevention
- **Access Control**: Name-based access control for individual templates

## Business Logic

- Templates are company-scoped (not global)
- Template names serve as unique identifiers within company scope
- Templates contain document categories and structure definitions
- Used for standardizing project setup across company projects

## TODO: Future Enhancements

### Security Improvements
- [ ] **Role-based Access Control**: Only company admins should manage templates - this is **very optional**, talk about this with supervisors (Joon)
- [ ] **Template Name Validation**: Add length limits, character restrictions, and format validation
- [ ] **Input Sanitization**: Sanitize template names to prevent injection attacks
- [ ] **Rate Limiting**: Add rate limiting for template creation and updates
- [ ] **Audit Logging**: Track who creates, updates, and deletes templates

### Business Logic Enhancements
- [ ] **Template Categories Validation**: Ensure category values are valid
- [ ] **Template Usage Validation**: Validate that referenced templates exist
- [ ] **Cascade Protection**: Prevent deletion if templates are currently in use
- [ ] **Soft Delete**: Add soft delete option for template recovery - **optional**
- [ ] **Template Versioning**: Support versioning for template changes - **optional**
- [ ] **Template Inheritance**: Allow templates to extend other templates - **optional**
- [ ] **Template Approval Workflow**: Add approval process for template changes - **optional**

### Performance & UX Improvements **optional**
- [ ] **Caching**: Cache frequently accessed templates
- [ ] **Pagination**: Add pagination for companies with many templates
- [ ] **Search & Filtering**: Add search by name, category, or creation date
- [ ] **Template Usage Analytics**: Track which templates are most used
- [ ] **Template Backup**: Create backups before updates
- [ ] **Progress Indicators**: Add loading states for template operations

### Collaboration Features **optional**
- [ ] **Template Sharing**: Allow sharing templates between users within company
- [ ] **Template Export/Import**: Secure way to share templates between companies
- [ ] **Template Comments**: Add comments and documentation to templates
- [ ] **Template Ratings**: Allow users to rate and review templates

### Technical Improvements
- [ ] **API Response Standardization**: Standardize error responses and success formats
- [ ] **Input Validation Enhancement**: Add comprehensive validation for all fields
- [ ] **Error Handling**: Improve error messages and handling
- [ ] **Testing**: Add comprehensive unit and integration tests
- [ ] **Documentation**: Add OpenAPI/Swagger documentation

## Implementation Priority

### High Priority (Security & Core Functionality)
1. Role-based access control
2. Template name validation and sanitization
3. Rate limiting
4. Cascade protection for deletions

### Medium Priority (User Experience)
1. Soft delete functionality
2. Template usage analytics
3. Search and filtering
4. Template sharing within company

### Low Priority (Advanced Features)
1. Template versioning
2. Template inheritance
3. Export/import functionality
4. Template approval workflows

## For Future Developers

When working on this API:

1. **Always maintain company isolation** - Never allow cross-company template access
2. **Validate template names** - Ensure uniqueness and proper format
3. **Consider template usage** - Check if templates are in use before deletion
4. **Follow existing patterns** - Use `withAuthDynamic` middleware and company scoping
5. **Add comprehensive tests** - Test multi-tenant scenarios and edge cases
6. **Document changes** - Update this documentation when adding new features

## Database Schema Notes

- Templates are stored in `project_templates` table
- Key fields: `name`, `templates` (array), `category`, `company_id`
- `name` serves as unique identifier within company scope
- `templates` field contains array of document template references
- `category` defines the document category for the template
