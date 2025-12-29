# Aticon Management Tool

A comprehensive web application for architecture and construction professionals, featuring project management, document templating, team collaboration, and AI-powered semantic search capabilities.

## Architecture Overview

This application follows a full-stack architecture with the following components:

1. **Next.js Frontend**: A React-based web application with server-side rendering
2. **Supabase Backend**: Database, authentication, and real-time subscriptions
3. **AI Services**: OpenAI integration for semantic search and document processing
4. **Vector Database**: Qdrant for storing and searching document embeddings

### System Architecture

```
┌─────────────────┐     ┌─────────────────┐     
│                 │     │                 │     
│  Next.js        │────▶│  Supabase      |     
│  Frontend       │     │  (Auth & DB)    │     
│  (App Router)   │◀─── │                │     
│                 │     │                 │     
└─────────────────┘     └─────────────────┘     
        │                        │              
        │                        │              
        ▼                        ▼              
┌─────────────────┐     ┌─────────────────┐     
│  OpenAI API &   │     │                 │     
│  Qdrant Cloud   │     │  File Storage   │     
│  (Vector DB)    │     │  (Documents)    │     
│                 │     │                 │     
└─────────────────┘     └─────────────────┘     
```

## Core Features

### ✅ Project Management
- Create and manage architecture/construction projects
- Assign team members and project leaders
- Track project progress and deadlines
- Organize projects with templates and documents
- Role-based access control (Admin, Company Admin, Project Manager, User)

### ✅ Document Templates
- Pre-built templates for various document categories:
  - Architecture documents
  - Constructions documents
  - Fire safety documents
  - Authority processing documents
  - Energy documents
  - HVAC (Heating, Ventilation, Air Conditioning) documents
  - Execution control documents
- Variable extraction and management
- Template assignment to projects
- Document generation with custom variables

### ✅ Team Collaboration
- Multi-tenant company structure
- User management and role assignment
- Project assignments and document supervision
- Company-wide template sharing
- Subscription management with usage tracking

### ✅ AI-Powered Semantic Search
- Chat interface for querying documents and regulations
- Integration with Danish building regulations (BR18)
- Context-aware responses using project data
- Document upload and processing
- Source attribution and confidence scoring

### ✅ User Authentication & Authorization
- Secure authentication via Supabase
- Role-based permissions system
- Company isolation and tenant security
- Session management and JWT tokens

## Technology Stack

### Frontend
- **Next.js 14**
- **TypeScript**
- **Tailwind CSS**
- **Radix UI**
- **Supabase Client**

### Backend Services
- **Supabase**
- **OpenAI API**
- **Qdrant Cloud**
- **Vercel**

## Development Setup

### Prerequisites
- Node.js 18+
- Supabase account and project
- OpenAI API key
- Qdrant Cloud account

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Qdrant Configuration
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Frontend Setup

```bash
# Install dependencies
npm install

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Database Setup

The application uses Supabase with PostgreSQL

Apply migrations:
```bash
# Apply all pending migrations
npx supabase db push

# Create a new migration
npx supabase db diff --schema public
```

## Deployment

### Production Deployment

The application is deployed on **Vercel** with the following services:

#### Vercel Deployment
```bash
# Deploy to Vercel
vercel --prod

# Or use the deployment script
./deploy-production.sh
```

#### External Services
- **Database**: Managed Supabase instance
- **Vector DB**: Qdrant Cloud
- **File Storage**: Vercel Blob Storage

### Environment Configuration

For production, ensure these environment variables are set:

```bash
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
OPENAI_API_KEY=your_openai_key
QDRANT_URL=your_production_qdrant_url
QDRANT_API_KEY=your_production_qdrant_key
```

## API Structure

The application uses Next.js API routes for all functionality:

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following the existing code style
4. Add tests for new functionality
5. Commit your changes: `git commit -am 'Add my feature'`
6. Push to the branch: `git push origin feature/my-feature`
7. Submit a pull request

### Code Style Guidelines
- Use TypeScript for all new code
- Follow the existing component structure
- Add proper error handling and logging
- Include JSDoc comments for complex functions
- Use semantic commit messages


## License

This project is proprietary software developed for Aticon. All rights reserved.
