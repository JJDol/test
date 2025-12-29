/**
 * Sign In Page
 * 
 * PURPOSE: Main authentication page for user login
 * - Handles user authentication via Supabase
 * - Redirects to dashboard upon successful authentication
 * 
 * ROUTE: /sign-in
 * 
 * ARCHITECTURE:
 * - Page: Thin container for composition and layout
 * - Custom Hook: Business logic and state management
 * - Components: Focused UI components with single responsibilities
 * - API Integration: Handled through custom hooks and actions
 */
import { Message } from "@/components/form-message";
import { SignInContainer } from "@/components/auth/sign-in-container";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AuthContentLayout } from "@/components/auth/auth-content-layout";

type SearchParams = {
  [key: string]: string | string[] | undefined;
} & {
  message?: Message;
};

export default async function Login(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  
  // Extract the message from searchParams if it exists
  let message: Message | undefined;
  if (searchParams.message) {
    if (typeof searchParams.message === 'string') {
      message = { message: searchParams.message };
    } else if (Array.isArray(searchParams.message)) {
      message = { message: searchParams.message[0] || '' };
    }
  }
  
  return (
    <>
      <AuthPageHeader
        title="Sign In"
        description="Welcome back! Please sign in to your account"
      />
      
      <AuthContentLayout>
        <SignInContainer message={message} />
      </AuthContentLayout>
    </>
  );
}
