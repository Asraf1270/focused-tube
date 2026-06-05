# FocusedTube Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] Copy `.env.example` to `.env.production`
- [ ] Set `VITE_SUPABASE_URL` to production Supabase URL
- [ ] Set `VITE_SUPABASE_ANON_KEY` to production anon key
- [ ] Set `VITE_YOUTUBE_API_KEY` to production YouTube API key
- [ ] Set `VITE_APP_URL` to production domain
- [ ] Enable `VITE_ENABLE_ANALYTICS=true`
- [ ] Enable `VITE_ENABLE_ERROR_REPORTING=true`
- [ ] Verify all feature flags are correctly set

### Security
- [ ] Enable Row Level Security on all Supabase tables
- [ ] Verify RLS policies are correctly configured
- [ ] Set up Content Security Policy headers
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS on production domain
- [ ] Set up security.txt file
- [ ] Configure robots.txt
- [ ] Verify API keys are restricted to production domains
- [ ] Remove any test/debug endpoints
- [ ] Sanitize all user inputs

### Database
- [ ] Run all migrations on production database
- [ ] Verify indexes are created
- [ ] Check database connection pooling
- [ ] Set up database backups
- [ ] Test database restore procedure
- [ ] Verify RLS policies in production

### API Keys & Services
- [ ] YouTube API key restricted to production domain
- [ ] Supabase project in production mode
- [ ] Google OAuth configured for production URLs
- [ ] Rate limiting configured
- [ ] API quotas checked

### Performance
- [ ] Run `npm run build` to create production build
- [ ] Analyze bundle size (`npm run analyze`)
- [ ] Verify code splitting is working
- [ ] Check lazy loading implementation
- [ ] Optimize images and assets
- [ ] Enable compression (gzip/brotli)
- [ ] Configure CDN for static assets
- [ ] Test Core Web Vitals
- [ ] Verify PWA manifest and service worker

### Testing
- [ ] Run full test suite
- [ ] Test all user flows
- [ ] Test authentication flow
- [ ] Test video playback
- [ ] Test note creation/editing
- [ ] Test bookmark functionality
- [ ] Test search functionality
- [ ] Test on mobile devices
- [ ] Test on different browsers
- [ ] Test offline functionality (PWA)
- [ ] Test error states
- [ ] Test loading states
- [ ] Test empty states

### Monitoring
- [ ] Set up error monitoring service
- [ ] Configure performance monitoring
- [ ] Set up uptime monitoring
- [ ] Configure alerting for critical errors
- [ ] Set up analytics tracking
- [ ] Create monitoring dashboard

## Deployment

### Build
```bash
# Clean install dependencies
npm ci

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Preview production build locally
npm run preview