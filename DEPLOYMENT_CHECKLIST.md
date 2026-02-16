# Production Deployment Checklist

## Pre-Deployment Security

### Environment Configuration
- [ ] Generate strong `ENCRYPTION_SECRET` (min 32 chars): `openssl rand -base64 32`
- [ ] Set all Firebase credentials in `.env`
- [ ] Configure Razorpay production keys
- [ ] Set up Sentry DSN for error tracking
- [ ] Verify Google OAuth client ID is configured
- [ ] Remove any test/development credentials
- [ ] Ensure `.env` is in `.gitignore`

### Firebase Setup
- [ ] Create production Firebase project (separate from dev)
- [ ] Enable Authentication (Email/Password, Google)
- [ ] Create Firestore database with security rules
- [ ] Enable Firebase Storage with security rules
- [ ] Deploy security rules: `firebase deploy --only firestore:rules,storage:rules`
- [ ] Set up Firebase Cloud Functions
- [ ] Configure Firebase billing (required for Cloud Functions)
- [ ] Enable Firebase Analytics
- [ ] Set up Firebase Performance Monitoring

### Security Audit
- [ ] Run `npm audit` and fix all vulnerabilities
- [ ] Review all API keys and secrets
- [ ] Verify encryption is working correctly
- [ ] Test rate limiting functionality
- [ ] Verify input validation on all forms
- [ ] Check for exposed sensitive data in logs
- [ ] Review Firestore security rules
- [ ] Review Storage security rules
- [ ] Test authentication flows
- [ ] Verify role-based access control

## App Store Compliance

### Legal Documents (REQUIRED)
- [ ] Create and publish Privacy Policy at `https://yourdomain.com/privacy-policy`
- [ ] Create and publish Terms of Service at `https://yourdomain.com/terms-of-service`
- [ ] Create and publish Refund Policy at `https://yourdomain.com/refund-policy`
- [ ] Update URLs in `constants/appInfo.ts`
- [ ] Add privacy policy link in app settings
- [ ] Add terms acceptance during signup

### iOS App Store
- [ ] Configure bundle identifier in `app.config.js`
- [ ] Set up App Store Connect account
- [ ] Create app listing with screenshots
- [ ] Add app description and keywords
- [ ] Set age rating (12+)
- [ ] Configure in-app purchases (if applicable)
- [ ] Add privacy nutrition labels
- [ ] Submit for review

### Google Play Store
- [ ] Configure package name in `app.config.js`
- [ ] Create Google Play Console account
- [ ] Generate upload keystore
- [ ] Create app listing with screenshots
- [ ] Add app description and keywords
- [ ] Set content rating (Everyone)
- [ ] Configure in-app products (if applicable)
- [ ] Complete data safety section
- [ ] Submit for review

## Payment Gateway

### Razorpay Production
- [ ] Switch from test to production keys
- [ ] Complete KYC verification
- [ ] Set up webhooks for payment events
- [ ] Configure payment methods (UPI, Cards, Net Banking)
- [ ] Test payment flow end-to-end
- [ ] Set up refund policies
- [ ] Configure settlement account
- [ ] Enable payment notifications

## Push Notifications

### Firebase Cloud Messaging
- [ ] Configure FCM credentials in Expo
- [ ] Upload APNs certificates (iOS)
- [ ] Upload FCM server key (Android)
- [ ] Test push notifications on real devices
- [ ] Verify notification permissions flow
- [ ] Test notification deep linking

## Testing

### Functional Testing
- [ ] Test user registration and login
- [ ] Test Google Sign-In
- [ ] Test farmhouse browsing and search
- [ ] Test booking flow (day use and overnight)
- [ ] Test payment integration
- [ ] Test booking cancellation and refunds
- [ ] Test owner property listing flow
- [ ] Test KYC document upload
- [ ] Test review submission
- [ ] Test wishlist functionality
- [ ] Test profile editing
- [ ] Test push notifications

### Device Testing
- [ ] Test on iPhone (latest iOS)
- [ ] Test on iPhone (iOS 13+)
- [ ] Test on Android flagship device
- [ ] Test on Android mid-range device
- [ ] Test on different screen sizes
- [ ] Test on tablets
- [ ] Test offline behavior
- [ ] Test slow network conditions

### Performance Testing
- [ ] Check app startup time
- [ ] Monitor memory usage
- [ ] Test with large datasets
- [ ] Check image loading performance
- [ ] Verify smooth scrolling
- [ ] Test concurrent user scenarios

## Monitoring & Analytics

### Error Tracking (Sentry)
- [ ] Configure Sentry production DSN
- [ ] Set up error alerting
- [ ] Configure release tracking
- [ ] Test error reporting
- [ ] Set up performance monitoring

### Analytics
- [ ] Configure Firebase Analytics
- [ ] Set up custom events
- [ ] Configure user properties
- [ ] Test analytics tracking
- [ ] Set up conversion funnels

### Logging
- [ ] Verify production logging is configured
- [ ] Ensure sensitive data is not logged
- [ ] Set up log aggregation
- [ ] Configure log retention policies

## Infrastructure

### Database
- [ ] Set up automated Firestore backups
- [ ] Configure database indexes
- [ ] Set up database monitoring
- [ ] Plan for database scaling

### Storage
- [ ] Configure CDN for images
- [ ] Set up image optimization
- [ ] Configure backup policies
- [ ] Plan for storage scaling

### Cloud Functions
- [ ] Deploy all Cloud Functions
- [ ] Configure function timeouts
- [ ] Set up function monitoring
- [ ] Configure function scaling

## Documentation

### Internal Documentation
- [ ] Update README.md with production setup
- [ ] Document deployment procedures
- [ ] Create runbook for common issues
- [ ] Document API endpoints
- [ ] Create database schema documentation

### User Documentation
- [ ] Create user guide
- [ ] Create FAQ section
- [ ] Prepare support documentation
- [ ] Create video tutorials (optional)

## Launch Preparation

### Marketing
- [ ] Prepare app store screenshots
- [ ] Create promotional video
- [ ] Set up social media accounts
- [ ] Prepare press release
- [ ] Plan launch campaign

### Support
- [ ] Set up support email (support@yourdomain.com)
- [ ] Create support ticket system
- [ ] Prepare support team
- [ ] Create canned responses for common issues

### Monitoring Dashboard
- [ ] Set up real-time monitoring dashboard
- [ ] Configure alerting for critical issues
- [ ] Set up on-call rotation
- [ ] Prepare incident response plan

## Post-Launch

### Week 1
- [ ] Monitor error rates closely
- [ ] Track user feedback
- [ ] Monitor payment success rates
- [ ] Check server performance
- [ ] Respond to user reviews
- [ ] Fix critical bugs immediately

### Week 2-4
- [ ] Analyze user behavior
- [ ] Identify friction points
- [ ] Plan improvements based on feedback
- [ ] Optimize performance bottlenecks
- [ ] Update documentation based on support tickets

### Ongoing
- [ ] Weekly dependency updates
- [ ] Monthly security audits
- [ ] Quarterly performance reviews
- [ ] Regular user feedback analysis
- [ ] Continuous feature improvements

## Emergency Procedures

### Critical Issues
- [ ] Document rollback procedure
- [ ] Prepare emergency contact list
- [ ] Create incident response template
- [ ] Set up status page
- [ ] Prepare communication templates

### Rollback Plan
- [ ] Keep previous version builds
- [ ] Document rollback steps
- [ ] Test rollback procedure
- [ ] Prepare user communication

---

## Sign-off

- [ ] Technical Lead approval
- [ ] Security Team approval
- [ ] QA Team approval
- [ ] Product Owner approval
- [ ] Legal Team approval

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Version**: 1.0.0  
**Status**: ⬜ Ready / ⬜ Not Ready
