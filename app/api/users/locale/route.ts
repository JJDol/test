import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { locales, type Locale } from '@/i18n/config';

async function updateLocaleHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { locale } = body;

    if (!locale || !locales.includes(locale as Locale)) {
      return NextResponse.json(
        { message: `Invalid locale. Supported: ${locales.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('users')
      .update({ preferred_locale: locale, updated_at: new Date().toISOString() })
      .eq('id', request.user.id);

    if (error) {
      console.error('Error updating locale:', error);
      return NextResponse.json(
        { message: 'Failed to update locale', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ locale });
  } catch (error: any) {
    console.error('Error in locale update:', error);
    return NextResponse.json(
      { message: 'Failed to update locale', error: error?.message },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(updateLocaleHandler);
