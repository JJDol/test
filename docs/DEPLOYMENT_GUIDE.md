# Invitation System Deployment Guide

## Quick Start

### 1. Database Migration
First, run the database migration to create the `user_invitations` table:

```bash
npx supabase db push
```

### 2. Configure Email Template
Set up the invitation email template in your Supabase dashboard:

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Create a new **Custom Template** for invitations
3. Use template variables for dynamic content
4. Test the template with sample data

### 3. Update App Environment
Add to your `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Testing the System

### Development Mode
In development, the system will:
1. Create invitation records in the database
2. Log invitation URLs to the console
3. Attempt to send emails via Edge Function

### Testing Invitations
1. Create an invitation as a company admin
2. Check the console for the invitation URL
3. Copy the URL and test the invitation flow
4. Verify the user account creation process

## Production Configuration

### Email Delivery
For production email delivery, you have several options:

#### Option A: Use Supabase Edge Function (Current)
The Edge Function currently logs emails. To enable actual email sending:

1. **Install email service package** (e.g., Resend):
   ```bash
   npm install resend
   ```

2. **Modify the Edge Function** to use the email service
3. **Set email service API keys** as Supabase secrets

#### Option B: Supabase Email Templates
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Create custom invitation template
3. Use template variables for dynamic content

#### Option C: External Email Service
1. Choose your preferred email service
2. Modify the Edge Function to integrate with it
3. Set API keys as environment variables

### Security Considerations
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept secure
- Use HTTPS in production
- Consider rate limiting for invitation creation
- Monitor invitation acceptance rates

## Monitoring

### Database Queries
Monitor invitation status:

```sql
-- Check invitation status
SELECT status, COUNT(*) FROM user_invitations GROUP BY status;

-- Check acceptance rate
SELECT 
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) * 100.0 / COUNT(*) as acceptance_rate
FROM user_invitations;

-- Find expired invitations
SELECT * FROM user_invitations 
WHERE status = 'pending' AND expires_at < NOW();
```

### Logs
- Check Edge Function logs in Supabase Dashboard
- Monitor application logs for invitation creation
- Track email delivery success/failure rates

## Troubleshooting

### Common Issues

1. **Edge Function not deploying**
   - Check Supabase CLI version
   - Verify project linking: `npx supabase status`

2. **Emails not sending**
   - Check Edge Function logs
   - Verify environment variables
   - Test Edge Function manually

3. **Invitation links not working**
   - Check `NEXT_PUBLIC_APP_URL` environment variable
   - Verify invitation token in database
   - Check invitation expiration

4. **Database errors**
   - Run `npx supabase db reset` if needed
   - Check RLS policies
   - Verify table structure

### Debug Mode
In development, the system provides detailed logging:
- Invitation creation details
- Email sending attempts
- Invitation URLs for testing

## Cost Optimization

### Supabase Edge Functions
- Free tier: 500,000 invocations/month
- Pro tier: $25/month for 2M invocations
- Pay-per-use beyond limits

### Email Costs
- **Resend**: $20/month for 50k emails
- **SendGrid**: $15/month for 40k emails  
- **AWS SES**: ~$0.10 per 1k emails

### Recommendations
- Start with Supabase Edge Functions (free)
- Move to external email service when scaling
- Monitor usage and optimize accordingly

## Next Steps

### Immediate
1. Deploy the system
2. Test with a few invitations
3. Configure email delivery

### Short-term
1. Customize email templates
2. Add invitation analytics
3. Implement invitation resend functionality

### Long-term
1. Add bulk invitation support
2. Integrate with SSO systems
3. Advanced invitation workflows
