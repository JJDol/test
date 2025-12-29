# Secure User Invitation System

## Overview

The application now uses a secure email-based invitation system instead of the previous password-based user creation. This approach eliminates security risks associated with temporary passwords and provides a better user experience.

## Key Benefits

### Security Improvements
- **No temporary passwords**: Users create their own secure passwords
- **Secure invitation links**: Time-limited, single-use tokens
- **No credential sharing**: Eliminates insecure transmission of passwords
- **Audit trail**: Complete tracking of invitations and acceptances

### User Experience
- **Professional process**: Follows enterprise security standards
- **Self-service setup**: Users complete their own account creation
- **Immediate access**: No password changes required after first login
- **Clear communication**: Professional email templates

### Compliance
- **Enterprise-ready**: Meets conservative industry requirements
- **Audit-friendly**: Complete invitation and acceptance tracking
- **Secure by design**: Follows security best practices

## How It Works

### 1. Admin Invites User
1. Company admin navigates to Profile → Team Management
2. Clicks "Add Colleague" button
3. Enters email, name, and role
4. System creates invitation record and sends email via Supabase Edge Function

### 2. User Receives Invitation
1. User receives professional email with invitation link
2. Email includes role information and expiration date
3. Link is valid for 7 days
4. Email is sent using Supabase's infrastructure

### 3. User Accepts Invitation
1. User clicks invitation link
2. Completes account setup form (name, password)
3. Account is created and user can immediately sign in
4. Invitation status is updated to 'accepted'

## Database Schema

### user_invitations Table
```sql
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL CHECK (role IN ('USER', 'MANAGER')),
    company_id UUID NOT NULL REFERENCES companies(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### POST /api/users/invite-colleague
Creates a new invitation and sends email via Supabase Edge Function.

**Request:**
```json
{
  "email": "user@company.com",
  "name": "John Doe",
  "role": "USER"
}
```

**Response:**
```json
{
  "message": "Invitation created successfully!",
  "user": {
    "email": "user@company.com",
    "name": "John Doe",
    "role": "USER",
    "company_id": "uuid"
  },
  "note": "The user will receive an email with a secure link to create their account."
}
```

### GET /api/users/validate-invitation?token=xxx
Validates an invitation token.

**Response:**
```json
{
  "message": "Invitation is valid",
  "invitation": {
    "id": "uuid",
    "email": "user@company.com",
    "name": "John Doe",
    "role": "USER",
    "company_id": "uuid",
    "expires_at": "2024-01-22T00:00:00Z",
    "status": "pending"
  }
}
```

### POST /api/users/accept-invitation
Accepts invitation and creates user account.

**Request:**
```json
{
  "token": "invitation-token",
  "name": "John Doe",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "message": "Account created successfully!",
  "user": {
    "id": "uuid",
    "email": "user@company.com",
    "name": "John Doe",
    "role": "USER",
    "company_id": "uuid"
  }
}
```

## Email Configuration

### Supabase Email Templates (Current Implementation)
The system is designed to work with Supabase's built-in email templates for a simple, integrated approach:

#### Option 1: Supabase Email Templates (Recommended for MVP)
Configure custom email templates in your Supabase dashboard:

1. **Go to Supabase Dashboard** → Authentication → Email Templates
2. **Create custom invitation template** with professional design
3. **Use template variables** for dynamic content:
   - `{{ .Email }}` - User's email address
   - `{{ .Role }}` - Assigned role (USER, MANAGER)
   - `{{ .CompanyName }}` - Company name
   - `{{ .InvitedByName }}` - Admin who sent invitation
   - `{{ .InvitationUrl }}` - Secure invitation link
   - `{{ .ExpiryDate }}` - When invitation expires

#### Option 2: External Email Services
For more control, integrate with external email services:
- **Resend** (popular with Next.js)
- **SendGrid** (enterprise-grade)
- **AWS SES** (cost-effective at scale)

#### Option 3: Supabase Edge Functions
For complex email logic, deploy custom Edge Functions later.

## Security Features

### Invitation Tokens
- **Cryptographically secure**: Uses UUID v4 for tokens
- **Time-limited**: 7-day expiration
- **Single-use**: Tokens are invalidated after acceptance
- **Unique**: No token collisions possible

### Rate Limiting
- **Duplicate prevention**: Only one pending invitation per email per company
- **Expiration handling**: Automatic cleanup of expired invitations

### Access Control
- **Company isolation**: Admins can only invite to their own company
- **Role restrictions**: Company admins can only invite USER and MANAGER roles
- **RLS policies**: Database-level security enforcement

## Migration from Old System

### Database Migration
Run the migration to create the new table:
```bash
npx supabase db push
```

### Code Changes
The old `create-colleague` endpoint is replaced with `invite-colleague`. The UI has been updated to use the new system.

### Backward Compatibility
- Existing users are unaffected
- Old API endpoints can be deprecated after migration
- No data migration required

## Monitoring and Maintenance

### Invitation Tracking
Monitor invitation status in the database:
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (accepted_at - created_at))/3600) as avg_hours_to_accept
FROM user_invitations 
GROUP BY status;
```

### Cleanup
Expired invitations are automatically marked as expired. Consider a scheduled job to delete old records:
```sql
DELETE FROM user_invitations 
WHERE status = 'expired' 
AND created_at < NOW() - INTERVAL '30 days';
```

## Troubleshooting

### Common Issues

1. **Email not received**
   - Check email service configuration
   - Verify invitation was created in database
   - Check spam folder

2. **Invitation link expired**
   - Create new invitation
   - Check system clock accuracy

3. **User already exists**
   - Check if user already has an account
   - Verify email address is correct

### Debug Mode
In development, invitation URLs are logged to console for testing.

## Future Enhancements

### Potential Improvements
- **Bulk invitations**: Invite multiple users at once
- **Invitation resend**: Allow admins to resend expired invitations
- **Custom email templates**: Company-branded invitation emails
- **Invitation analytics**: Track acceptance rates and timing
- **SSO integration**: Support for SAML/OAuth invitations
