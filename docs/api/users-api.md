# Users API Routes Documentation

## Overview

The Users API routes handle all user management operations including profile management, user creation, deletion, and search functionality. All routes enforce multi-tenant company isolation and role-based access control, ensuring secure user operations across the construction project management system.

## Route Structure

```
/api/users/
├── route.ts                           # User collection operations (GET)
├── create-colleague/
│   └── route.ts                       # Create new company users (POST)
├── delete-colleague/
│   └── route.ts                       # Remove company users (POST)
├── profile/
│   └── route.ts                       # User profile management (GET, PATCH)
└── search/
    └── route.ts                       # User search functionality (GET)
```

## Route Details

### `/api/users` (User Collection Operations)

**Purpose:** Retrieve and manage user profiles across the system with role-based access control
- **GET:** List users filtered by company and role permissions
- **Security:** Authentication required, RLS policies enforce company isolation

**Key Features:**
- Role-based user filtering (ADMIN sees all, COMPANY_ADMIN sees company users, others see only themselves)
- Multi-tenant isolation through database RLS policies
- User profile data including role, company assignment, and timestamps

**Security:**
- Authentication required via `withAuth` middleware
- Company isolation enforced through RLS policies
- Role-based access: ADMIN (all users), COMPANY_ADMIN (company users), USER/MANAGER (self only)

**Future Enhancements:**
- PATCH method for bulk user updates (role changes, company transfers)
- User deactivation/reactivation functionality
- User activity tracking and last login timestamps
- Pagination for large user lists (>100 users)
- User export functionality for compliance reporting
- User search and filtering capabilities
- Audit logging for user management operations

---

### `/api/users/create-colleague` (User Creation)

**Purpose:** Create new user accounts within a company with proper authentication setup
- **Method:** POST
- **Functionality:** Creates both Supabase auth users and profile records

**Key Features:**
- Secure temporary password generation for new users
- Automatic profile creation with company assignment
- Role validation (USER, MANAGER only for company admins)
- Email uniqueness validation
- Service role integration for auth user creation

**Security:**
- Authentication required via `withCompanyAdmin` middleware
- Company isolation enforced (users can only be created within admin's company)
- Role restrictions prevent privilege escalation
- Environment variable validation for service role access

**User Creation Flow:**
1. Validate current user permissions and company assignment
2. Check email uniqueness across the system
3. Generate secure temporary password
4. Create Supabase auth user with admin client
5. Create user profile record in public.users table
6. Return login credentials for immediate access

**Future Enhancements:**
- Replace temporary password generation with email invitation system
- Add email verification workflow for new users
- Implement user onboarding flow and welcome emails
- Add user creation approval workflow for sensitive roles
- Consider integration with SSO providers for enterprise customers
- Add user creation rate limiting to prevent abuse
- Implement user template system for common role configurations
- Add audit trail for user creation operations
- Consider bulk user import functionality for large companies

---

### `/api/users/delete-colleague` (User Deletion)

**Purpose:** Remove user accounts from the system with proper cleanup and validation
- **Method:** POST
- **Functionality:** Deletes both Supabase auth users and profile records

**Key Features:**
- Comprehensive user validation before deletion
- Safety checks to prevent self-deletion and admin removal
- Cascading deletions through database triggers
- Service role integration for auth user cleanup
- Company isolation enforcement

**Security:**
- Authentication required via `withCompanyAdmin` middleware
- Company isolation enforced (users can only be deleted within admin's company)
- Role-based restrictions prevent admin user deletion
- Self-deletion prevention for security

**Deletion Flow:**
1. Validate current user permissions and company assignment
2. Verify target user exists and belongs to same company
3. Prevent deletion of admin users and self
4. Delete user profile from public.users table
5. Delete auth user from Supabase auth system
6. Handle cleanup errors gracefully

**Future Enhancements:**
- Implement soft delete option for compliance and audit requirements
- Add user deactivation as alternative to permanent deletion
- Create user transfer functionality between companies
- Add bulk user deletion for company closures
- Implement user deletion approval workflow for sensitive accounts
- Add data export before deletion for compliance purposes
- Consider user deletion recovery window (7-30 days)
- Add notification system for affected users and admins
- Implement user deletion analytics and reporting
- Add cleanup for user-generated content and files

---

### `/api/users/profile` (Profile Management)

**Purpose:** Handle user profile operations including retrieval, creation, and updates
- **Methods:** GET, PATCH
- **Functionality:** Manages user profile data with automatic profile creation

**Key Features:**
- Automatic profile creation for new users
- JWT metadata synchronization after profile updates
- Profile data validation and sanitization
- Company and role assignment management

**Security:**
- Authentication required via `withAuth` middleware
- Users can only access and modify their own profiles
- Company isolation enforced through user context

**Profile Operations:**
- **GET:** Retrieve user profile with auto-creation fallback
- **PATCH:** Update profile information (name, role, company assignment)

**Future Enhancements:**
- Add profile picture upload and management functionality
- Implement profile completion workflow for new users
- Add profile validation rules and data sanitization
- Consider profile templates for different user types
- Add profile change history and audit logging
- Implement profile export functionality for compliance
- Add profile completion percentage tracking
- Consider profile backup and restore capabilities
- Add profile sharing and visibility controls
- Implement profile synchronization with external systems

---

### `/api/users/search` (User Search)

**Purpose:** Provide secure user search functionality within company boundaries
- **Method:** GET
- **Functionality:** Searches users by email and name within company scope

**Key Features:**
- Real-time user discovery for collaboration features
- Company-isolated search results
- Performance-optimized result limiting (5 results)
- Multi-field search (email and name)

**Security:**
- Authentication required via `withAuth` middleware
- Company isolation enforced through company_id filtering
- Search results limited to prevent data exposure
- Multi-tenant validation for all search operations

**Search Capabilities:**
- Email-based search with partial matching
- Name-based search with partial matching
- Company-scoped results only
- Result count limiting for performance

**Future Enhancements:**
- Implement advanced search filters (role, department, project assignment)
- Add search result ranking and relevance scoring
- Consider implementing full-text search with PostgreSQL extensions
- Add search result caching for frequently searched terms
- Implement search analytics and popular search tracking
- Add search result export functionality
- Consider implementing search suggestions and autocomplete
- Add search result pagination for large result sets
- Implement search result highlighting and context
- Add search permission controls for sensitive user data

---

## Security Architecture

### Multi-Tenant Isolation
All user routes enforce strict company isolation through:
- **Database Level:** Row Level Security (RLS) policies
- **Application Level:** Company ID validation in middleware
- **API Level:** Company-scoped queries and operations

### Role-Based Access Control
User operations are restricted based on user roles:
- **ADMIN:** Full system access, can manage users across all companies
- **COMPANY_ADMIN:** Company-scoped user management
- **MANAGER/USER:** Limited to self-profile operations

### Authentication & Authorization
- **Middleware:** All routes use authentication middleware
- **Service Role:** Admin operations use Supabase service role for auth user management
- **JWT Management:** Profile updates synchronize with JWT metadata

## Data Flow

### User Creation Flow
```
Admin Request → Permission Validation → Company Assignment → Auth User Creation → Profile Creation → Credential Generation
```

### User Deletion Flow
```
Admin Request → Permission Validation → Company Verification → Profile Deletion → Auth User Deletion → Cleanup Verification
```

### Profile Management Flow
```
User Request → Authentication → Profile Retrieval/Creation → Data Validation → Database Update → JWT Sync
```

## Error Handling

### Common Error Scenarios
- **Permission Denied:** Insufficient role or company access
- **User Not Found:** Target user doesn't exist or belongs to different company
- **Validation Errors:** Missing required fields or invalid data
- **Service Errors:** Supabase auth or database operation failures

### Error Response Format
```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "details": "Technical error details (when applicable)"
}
```

## Performance Considerations

### Query Optimization
- **Indexing:** Company ID and role-based indexes for efficient filtering
- **Result Limiting:** Search results capped at 5 users for performance
- **RLS Policies:** Database-level filtering reduces application overhead

### Caching Strategy
- **Profile Data:** Consider implementing Redis caching for frequently accessed profiles
- **Search Results:** Implement search result caching for common queries
- **User Lists:** Pagination for large user collections

## Compliance & Audit

### Data Retention
- **User Profiles:** Retained according to company data retention policies
- **Audit Logs:** User management operations should be logged for compliance
- **Deletion Tracking:** Soft delete options for regulatory compliance

### Audit Requirements
- **User Creation:** Track who created users and when
- **Role Changes:** Log all role and permission modifications
- **Company Transfers:** Audit trail for user company assignments
- **Access Patterns:** Monitor user access and activity patterns

## Integration Points

### Authentication System
- **Supabase Auth:** Primary authentication provider
- **JWT Management:** Profile updates synchronize with JWT metadata
- **Service Role:** Admin operations require service role access

### Database Integration
- **Users Table:** Primary user profile storage
- **RLS Policies:** Enforce company isolation at database level
- **Triggers:** Handle auth user synchronization

### Frontend Integration
- **User Management UI:** Company admin interfaces for user operations
- **Profile Management:** User profile editing and viewing
- **Search Interface:** User discovery and collaboration features

## Future Roadmap

### Phase 1: Core Functionality
- [x] User creation and deletion
- [x] Profile management
- [x] Basic search functionality
- [x] Multi-tenant security

### Phase 2: Enhanced Features
- [ ] Email invitation system
- [ ] Profile completion workflows
- [ ] Advanced search capabilities
- [ ] Audit logging system

### Phase 3: Enterprise Features
- [ ] SSO integration
- [ ] Bulk user operations
- [ ] Advanced compliance features
- [ ] Performance optimization

### Phase 4: Advanced Analytics
- [ ] User activity tracking
- [ ] Access pattern analysis
- [ ] Compliance reporting
- [ ] Performance monitoring
