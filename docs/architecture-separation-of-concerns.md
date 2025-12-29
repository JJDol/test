# Architecture: Separation of Concerns

## Overview

This document outlines the architectural pattern used in our construction industry MVP to ensure security, maintainability, and scalability. The core principle is **separation of concerns** - each layer has a single, well-defined responsibility.

## Why This Architecture?

### For Construction Industry Requirements
- **Security**: All database operations go through authenticated API routes
- **Compliance**: Clear audit trail for enterprise requirements
- **Reliability**: Predictable data flow and error handling
- **Trust**: Conservative customers expect proven, stable solutions

### For Development Team
- **Maintainability**: Clear structure for solo developer and future team growth
- **Scalability**: Easy to add features without breaking existing functionality
- **Testing**: Each layer can be tested independently
- **Debugging**: Issues can be quickly isolated to specific layers

## Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (Server-side only)
│   │   ├── projects/
│   │   │   └── [projectId]/
│   │   │       └── workers/
│   │   │           └── route.ts
│   │   └── users/
│   │       └── route.ts
│   └── (routes)/          # Page Components (Client-side only)
│       ├── projects/
│       └── dashboard/
├── components/             # UI Components (Client-side only)
│   ├── ui/                # Reusable UI components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── project-workers-dialog.tsx
│   └── features/          # Feature-specific components
│       └── projects/
│           └── project-card.tsx
├── hooks/                  # Business Logic (Client-side only)
│   ├── useProjectWorkers.ts
│   ├── useAuth.ts
│   └── useDocuments.ts
├── lib/                    # Utilities & Configuration
│   ├── supabase-server.ts  # Server-side Supabase client
│   ├── supabase-client.ts  # Client-side Supabase client
│   └── utils.ts
└── types/                  # TypeScript definitions
    └── index.ts
```

## Layer Responsibilities

### 1. API Routes (`/app/api/`) - Server-Side Only
**What**: Handle all database operations and business logic
**Why**: Security, authentication, and data validation
**Never**: Render UI or manage component state

**Responsibilities**:
- Database queries (Supabase operations)
- User authentication and authorization
- Input validation and sanitization
- Business logic processing
- Error handling and logging

### 2. Hooks (`/hooks/`) - Client-Side Business Logic
**What**: Manage component state and business operations
**Why**: Reusable logic, clean component code
**Never**: Direct database access or server-side operations

**Responsibilities**:
- Component state management
- API calls to routes
- Data formatting for UI
- User interaction handling
- Error state management

### 3. Components (`/components/`) - Client-Side UI Only
**What**: Render the user interface
**Why**: Focus on presentation and user experience
**Never**: Database operations or complex business logic

**Responsibilities**:
- UI rendering
- User event handling
- Using hooks for logic
- Styling and layout

## Data Flow Example

Let's trace through adding workers to a project:

```
User clicks "Add Workers" button
    ↓
Component calls hook method: addWorkers(projectId, workerIds)
    ↓
Hook makes API call: POST /api/projects/{projectId}/workers
    ↓
API route validates user authentication
    ↓
API route queries Supabase database
    ↓
API route returns success/error response
    ↓
Hook updates component state based on response
    ↓
Component re-renders with updated data
```

## Implementation Examples

### API Route Example
```typescript
// app/api/projects/[projectId]/workers/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createServerSupabaseClient()
  
  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Input validation
  const { workers } = await request.json()
  if (!workers || !Array.isArray(workers)) {
    return NextResponse.json({ error: 'Invalid workers data' }, { status: 400 })
  }

  // 3. Business logic
  const { error } = await supabase
    .from('project_workers')
    .insert(workers.map(workerId => ({
      project_id: params.projectId,
      worker_id: workerId,
      added_by: user.id,
      added_at: new Date().toISOString()
    })))

  // 4. Response handling
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Workers added successfully' })
}
```

### Hook Example
```typescript
// hooks/useProjectWorkers.ts
import { useState, useCallback } from 'react'

interface Worker {
  id: string
  name: string
  email: string
}

export function useProjectWorkers(projectId: string) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkers = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/workers`)
      if (!response.ok) {
        throw new Error('Failed to fetch workers')
      }
      
      const data = await response.json()
      setWorkers(data.workers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const addWorkers = useCallback(async (workerIds: string[]) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workers: workerIds })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add workers')
      }
      
      // Refresh workers list
      await fetchWorkers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId, fetchWorkers])

  return {
    workers,
    loading,
    error,
    fetchWorkers,
    addWorkers
  }
}
```

### Component Example
```typescript
// components/ui/project-workers-dialog.tsx
import { useProjectWorkers } from '@/hooks/useProjectWorkers'

interface ProjectWorkersDialogProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function ProjectWorkersDialog({ projectId, isOpen, onClose }: ProjectWorkersDialogProps) {
  const { workers, loading, error, addWorkers } = useProjectWorkers(projectId)
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])

  const handleAddWorkers = async () => {
    if (selectedWorkers.length === 0) return
    
    await addWorkers(selectedWorkers)
    setSelectedWorkers([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Workers to Project</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        
        {/* Worker selection UI */}
        <div className="space-y-4">
          {/* Your worker selection components */}
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleAddWorkers}
            disabled={loading || selectedWorkers.length === 0}
          >
            {loading ? 'Adding...' : 'Add Workers'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## Migration Steps

### Phase 1: Create Infrastructure
1. Set up folder structure
2. Create server-side Supabase client
3. Create client-side Supabase client
4. Set up basic API route structure

### Phase 2: Move Database Operations
1. Identify all direct database calls in components
2. Create corresponding API routes
3. Move business logic to hooks
4. Update components to use hooks

### Phase 3: Optimize and Test
1. Add proper error handling
2. Implement loading states
3. Add input validation
4. Test all data flows

### Phase 4: Add Enterprise Features
1. Implement logging and monitoring
2. Add rate limiting
3. Implement caching strategies
4. Add audit trails

## Security Benefits

### Authentication
- All API routes verify user identity
- No database credentials in frontend
- Session management handled server-side

### Authorization
- Role-based access control in API routes
- Project-level permissions enforced
- Audit trail for all operations

### Data Validation
- Input sanitization in API routes
- SQL injection prevention
- XSS protection through proper escaping

## Performance Benefits

### Build Time
- Eliminates Next.js static generation warnings
- Better tree-shaking and bundling
- Optimized server-side rendering

### Runtime
- Reduced client-side bundle size
- Better caching strategies
- Optimized database queries

## Maintenance Benefits

### Debugging
- Clear separation makes issues easier to isolate
- API routes can be tested independently
- Frontend issues don't affect backend logic

### Testing
- Unit tests for each layer
- Integration tests for API routes
- Component tests with mocked hooks

### Team Growth
- New developers understand structure quickly
- Clear boundaries prevent conflicts
- Consistent patterns across codebase

## Common Anti-Patterns to Avoid

### ❌ Don't Do This
```typescript
// Component directly calling Supabase
const handleAddWorker = async () => {
  const { data, error } = await supabase
    .from('project_workers')
    .insert({ project_id: projectId, worker_id: workerId })
  // ... handle response
}
```

### ✅ Do This Instead
```typescript
// Component using hook
const { addWorkers } = useProjectWorkers(projectId)

const handleAddWorker = async () => {
  await addWorkers([workerId])
}
```

## Conclusion

This architecture provides the foundation for a secure, maintainable, and scalable construction industry MVP. By following these principles, you'll build a system that construction companies can trust while maintaining code quality that supports future growth.

Remember: **Security first, separation of concerns, and business logic in hooks** - these principles will guide you to success.
