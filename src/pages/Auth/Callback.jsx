import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  async function handleAuthCallback() {
    try {
      setStatus('Verifying your identity...');
      
      // Get the session from URL
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        throw new Error('No session found. Please try signing in again.');
      }

      setStatus('Setting up your learning space...');

      // Check if profile exists, if not create one
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        setStatus('Creating your profile...');
        
        // Create profile for new user
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            username: session.user.email?.split('@')[0] || `user_${Date.now()}`,
            display_name: session.user.user_metadata?.full_name || 
                         session.user.email?.split('@')[0] || 
                         'Learner',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            preferences: {
              theme: 'dark',
              autoplay: false,
              playback_speed: 1.0,
              default_quality: 'auto',
              show_captions: true,
              focus_mode: {
                enabled: false,
                hide_comments: true,
                hide_suggestions: true,
                hide_likes: true,
              },
            },
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw - profile creation failure shouldn't block login
        }
      }

      setStatus('Welcome to FocusedTube!');

      // Redirect to home page
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);

    } catch (err) {
      console.error('Auth callback error:', err);
      setError(err.message || 'Authentication failed');
      
      // Redirect to login after 3 seconds on error
      setTimeout(() => {
        navigate('/login', { 
          replace: true,
          state: { message: 'Authentication failed. Please try again.' }
        });
      }, 3000);
    }
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md"
      >
        {error ? (
          // Error State
          <div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-heading-md font-semibold text-text-primary mb-2">
              Authentication Failed
            </h2>
            <p className="text-body-base text-text-secondary mb-4">
              {error}
            </p>
            <p className="text-body-sm text-text-tertiary">
              Redirecting to login page...
            </p>
          </div>
        ) : (
          // Loading State
          <div>
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-surface-hover rounded-full" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-accent-blue rounded-full border-t-transparent"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-heading-md font-semibold text-text-primary mb-2">
              Setting Up Your Space
            </h2>
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-body-base text-text-secondary"
            >
              {status}
            </motion.p>
          </div>
        )}
      </motion.div>
    </div>
  );
}