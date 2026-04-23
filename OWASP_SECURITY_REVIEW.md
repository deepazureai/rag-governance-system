# OWASP Security Review - Code Locations & Checklist

## Overview
This document maps each OWASP Top 10 vulnerability to specific code locations that will be reviewed for security hardening.

---

## OWASP Top 10 Security Review Checklist

### 1. Injection (SQL, NoSQL, Command, SSRF)
**Status:** Partially Protected
**Code Locations to Review:**

#### MongoDB Operations (Protected)
- `/backend/src/api/alertsRoutes.ts` - Lines 32-48 (SLA collection queries)
- `/backend/src/api/governanceMetricsRoutes.ts` - Lines 43-72 (calculations)
- `/backend/src/api/alertsRoutes.ts` - Lines 117-157 (filtering)

**Protections in Place:**
- MongoDB driver prevents injection via native parameter binding
- Query builders use object notation (not string concatenation)

**Action Items:**
- [ ] Review all filter objects for potential injection vectors
- [ ] Add NoSQL injection tests
- [ ] Validate metricName parameter against whitelist

#### Parameter Validation (Protected)
- `/backend/src/api/alertsRoutes.ts` - Uses `getStringParam()` utility (lines 15, 60)
- `/backend/src/api/governanceMetricsRoutes.ts` - Uses `getStringParam()` utility (lines 15)

**Review Needed:**
- [ ] Audit `getStringParam()` implementation in `/backend/src/utils/paramParser.ts`
- [ ] Ensure maximum length validation
- [ ] Verify regex patterns prevent bypass

#### Database Connection (HIGH RISK)
- `/poller/src/postgresql.ts` - PostgreSQL connection and queries
- `/poller/src/index.ts` - Database initialization

**CRITICAL SECURITY ITEMS:**
- [ ] Review SQL query generation in `fetchNewRecords()`
- [ ] Ensure all queries use parameterized statements
- [ ] Check for command injection in shell execution (if any)
- [ ] Validate table names and column names against whitelist

---

### 2. Broken Authentication
**Status:** NOT IMPLEMENTED (CRITICAL GAP)
**Code Locations:**
- `/backend/src/index.ts` - No authentication middleware
- `/app/alerts/page.tsx` - No auth check
- `/app/governance/page.tsx` - No auth check

**CRITICAL ACTION ITEMS:**
- [ ] Implement authentication middleware (JWT, OAuth2, or session-based)
- [ ] Add auth guards to all backend endpoints
- [ ] Add auth checks to frontend pages
- [ ] Implement logout functionality
- [ ] Add password reset flow
- [ ] Enable HTTPS everywhere
- [ ] Implement rate limiting on auth endpoints

**Recommended Implementation:**
- Use Auth0, Azure AD, or custom JWT with RS256
- Add bearer token validation to `/backend/src/index.ts`
- Protect routes with middleware

---

### 3. Sensitive Data Exposure
**Status:** NEEDS REMEDIATION
**Code Locations:**
- `/poller/src/keyvault.ts` - Credentials handling
- `/backend/src/index.ts` - Environment variables
- `/backend/src/api/alertsRoutes.ts` - Logging (line 47, 83)
- `/poller/src/poller.ts` - Logging (lines 149-155)

**CRITICAL ACTION ITEMS:**
- [ ] Implement Azure KeyVault for all secrets
- [ ] Never log sensitive data (passwords, API keys, connection strings)
- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Implement data encryption at rest for MongoDB
- [ ] Review all error messages (no sensitive data exposure)
- [ ] Add database encryption (MongoDB encryption at rest)

**Review Needed:**
- [ ] Audit logger.info/error calls for sensitive data
- [ ] Check environment variables don't contain secrets in error messages
- [ ] Verify no secrets in response bodies

**Files to Update:**
- `/backend/src/utils/logger.ts` - Add sensitive data masking
- `/poller/src/utils.ts` - Add sensitive data masking
- `/backend/src/index.ts` - Add HTTPS configuration

---

### 4. Broken Access Control
**Status:** NOT IMPLEMENTED (CRITICAL GAP)
**Code Locations:**
- `/backend/src/api/alertsRoutes.ts` - All endpoints (no authorization)
- `/backend/src/api/governanceMetricsRoutes.ts` - All endpoints (no authorization)
- `/app/alerts/page.tsx` - No role-based filtering
- `/app/governance/page.tsx` - No role-based filtering

**CRITICAL ACTION ITEMS:**
- [ ] Implement Role-Based Access Control (RBAC)
- [ ] Add role-based filtering to alerts (only show alerts for user's apps)
- [ ] Verify users can only see their own applications
- [ ] Implement cross-tenant isolation
- [ ] Add authorization middleware to backend
- [ ] Add resource ownership validation

**Recommended Implementation:**
- Add role field to JWT token or session
- Implement authorization middleware in `/backend/src/middleware/`
- Add `applicationId` filtering based on user's authorized apps
- Block cross-tenant data access

---

### 5. Security Misconfiguration
**Status:** NEEDS REVIEW
**Code Locations:**
- `/backend/src/index.ts` - Express configuration
- `/poller/src/index.ts` - Poller configuration
- `package.json` - Dependencies (needs audit)

**ACTION ITEMS:**
- [ ] Enable CORS properly (don't allow * origin in production)
- [ ] Disable unnecessary HTTP methods (OPTIONS, TRACE, CONNECT)
- [ ] Set security headers (HSTS, CSP, X-Frame-Options, etc.)
- [ ] Configure rate limiting
- [ ] Enable request logging
- [ ] Set appropriate timeouts
- [ ] Validate all environment variables on startup

**Code to Add:**
```typescript
// Express security headers
app.use(helmet()); // Add helmet middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGINS })); // Restrict CORS
app.set('trust proxy', 1); // Trust proxy for rate limiting
```

---

### 6. Cross-Site Scripting (XSS)
**Status:** PROTECTED (Next.js & React)
**Code Locations:**
- `/app/alerts/page.tsx` - All JSX rendering
- `/app/governance/page.tsx` - All JSX rendering

**Protections in Place:**
- React auto-escapes content in JSX
- Next.js CSP headers (verify enabled)

**ACTION ITEMS:**
- [ ] Verify CSP headers are configured
- [ ] Audit any `dangerouslySetInnerHTML` usage (should have none)
- [ ] Test with XSS payloads in metric names and alert messages
- [ ] Add Content-Security-Policy headers

---

### 7. Cross-Site Request Forgery (CSRF)
**Status:** NEEDS IMPLEMENTATION
**Code Locations:**
- `/backend/src/api/alertsRoutes.ts` - POST/PATCH endpoints
- `/backend/src/api/governanceMetricsRoutes.ts` - POST endpoint
- `/app/alerts/page.tsx` - Form submissions

**ACTION ITEMS:**
- [ ] Implement CSRF token generation and validation
- [ ] Use SameSite cookie attribute (SameSite=Strict)
- [ ] Add CSRF middleware to backend
- [ ] Include CSRF token in all state-changing requests

**Recommended Implementation:**
- Add `csrf` middleware from `csurf` package
- Generate tokens on page load
- Include in all POST/PATCH/DELETE requests

---

### 8. Using Components with Known Vulnerabilities
**Status:** NEEDS AUDIT
**Code Locations:**
- `/package.json` - Frontend dependencies
- `/backend/package.json` - Backend dependencies
- `/poller/package.json` - Poller dependencies

**ACTION ITEMS:**
- [ ] Run `npm audit` on all packages
- [ ] Review high/critical vulnerabilities
- [ ] Update dependencies to latest versions
- [ ] Implement automated dependency scanning
- [ ] Set up Dependabot for GitHub
- [ ] Review security advisories

**Commands:**
```bash
npm audit --production
npm audit fix
npm update
```

---

### 9. Insufficient Logging and Monitoring
**Status:** PARTIALLY IMPLEMENTED
**Code Locations:**
- `/backend/src/utils/logger.ts` - Logging utility
- `/poller/src/utils.ts` - Poller logging
- `/backend/src/api/alertsRoutes.ts` - API logging (lines 47, 83, 152)

**ACTION ITEMS:**
- [ ] Add structured logging (JSON format)
- [ ] Log security events (auth attempts, unauthorized access)
- [ ] Add request ID tracking for request tracing
- [ ] Implement centralized log aggregation
- [ ] Set up alerting for security events
- [ ] Add performance monitoring
- [ ] Implement distributed tracing

**Events to Log:**
- Authentication attempts (success/failure)
- Authorization failures
- Data access (who, what, when)
- Bulk operations
- Errors and exceptions
- External API calls

---

### 10. API Security
**Status:** PARTIALLY IMPLEMENTED
**Code Locations:**
- `/backend/src/api/alertsRoutes.ts` - All endpoints
- `/backend/src/api/governanceMetricsRoutes.ts` - All endpoints
- `/backend/src/index.ts` - API configuration

**ACTION ITEMS:**
- [ ] Implement rate limiting (per IP, per user, per endpoint)
- [ ] Add request validation (JSON schema)
- [ ] Implement pagination with maximum limits (✓ done: max 100)
- [ ] Add request timeout handling
- [ ] Implement API versioning
- [ ] Add deprecation headers for old endpoints
- [ ] Document API security requirements

**Recommended Libraries:**
- `express-rate-limit` - Rate limiting
- `joi` or `zod` - Request validation
- `helmet` - Security headers

---

## Files Requiring Security Updates

### HIGH PRIORITY (Security Critical)
- [ ] `/backend/src/index.ts` - Add auth middleware, security headers, CORS
- [ ] `/backend/src/api/alertsRoutes.ts` - Add authorization checks
- [ ] `/backend/src/api/governanceMetricsRoutes.ts` - Add authorization checks
- [ ] `/poller/src/postgresql.ts` - Audit SQL queries, ensure parameterized
- [ ] `/poller/src/keyvault.ts` - Implement proper secret management

### MEDIUM PRIORITY
- [ ] `/backend/src/utils/logger.ts` - Add sensitive data masking
- [ ] `/app/alerts/page.tsx` - Add auth checks, CSRF protection
- [ ] `/app/governance/page.tsx` - Add auth checks, CSRF protection
- [ ] `/backend/src/api/alertsRoutes.ts` - Add input validation
- [ ] `/backend/src/api/governanceMetricsRoutes.ts` - Add input validation

### LOW PRIORITY
- [ ] `package.json` files - Update dependencies
- [ ] Config files - Add security headers, CORS settings
- [ ] Documentation - Add security best practices

---

## Testing Security Controls

### Test Cases to Add

**1. Injection Tests**
```typescript
// Test NoSQL injection in metric name filter
GET /api/alerts/applications/{appId}?metricName={$ne: null}

// Test SQL injection in poller (if applicable)
SELECT * FROM records WHERE id > "1; DROP TABLE--"
```

**2. Authentication Tests**
```typescript
// Test endpoints without auth token
POST /api/alerts/bulk-action (should fail)
GET /api/governance-metrics/applications/{appId} (should fail)
```

**3. Authorization Tests**
```typescript
// User A tries to access App B's alerts
GET /api/alerts/applications/{appB_id} (should fail for unauthorized user)
```

**4. Rate Limiting Tests**
```typescript
// Make 100+ requests in short time
// Should return 429 Too Many Requests
```

**5. Input Validation Tests**
```typescript
// Test oversized payloads
POST /api/alerts/bulk-action (50MB payload)

// Test invalid characters
POST /api/alerts/bulk-action (applicationId with script tags)
```

---

## OWASP Review Timeline

**Week 1: Critical Vulnerabilities**
- Authentication implementation
- Authorization implementation
- SQL injection review

**Week 2: Data Security**
- KeyVault integration
- Encryption at rest
- Sensitive data logging review

**Week 3: API Security**
- Rate limiting
- CSRF protection
- Request validation

**Week 4: Monitoring & Testing**
- Logging hardening
- Security test cases
- Vulnerability scanning

---

## Sign-Off Checklist

After security review, verify:
- [ ] All 10 OWASP vulnerabilities addressed
- [ ] Security test cases pass
- [ ] Penetration testing completed
- [ ] Dependency audit passed
- [ ] Code review approved
- [ ] Security policy documented
- [ ] Incident response plan ready
- [ ] Deployment checklist verified

---

**Document Status:** Ready for OWASP Security Review
**Last Updated:** 2024-03-20
**Next Review:** After implementation fixes
