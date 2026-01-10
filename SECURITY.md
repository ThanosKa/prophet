# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Prophet, please report it privately:

### How to Report

1. **Email**: Contact the maintainer via GitHub at [@ThanosKa](https://github.com/ThanosKa)
2. **Private Security Advisory**: Use GitHub's [private vulnerability reporting](https://github.com/ThanosKa/prophet/security/advisories/new)

### What to Include

When reporting a vulnerability, please include:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity
- Suggested fix (if you have one)
- Your contact information for follow-up

### Response Timeline

- You will receive an acknowledgment within **48 hours**
- We will investigate and provide updates on progress
- Once confirmed, we will:
  1. Work on a fix
  2. Release a security patch
  3. Credit you in the release notes (if desired)
  4. Publish a security advisory

## Security Best Practices

When self-hosting Prophet, follow these security practices:

### Environment Variables
- Never commit `.env.local` files to version control
- Use strong, randomly generated secrets for:
  - `CLERK_SECRET_KEY`
  - `ANTHROPIC_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `UPSTASH_REDIS_REST_TOKEN`
- Rotate credentials regularly

### Database
- Use strong database passwords
- Enable SSL/TLS connections to Supabase
- Consider enabling Row Level Security (RLS) before production
- Keep database migrations up to date

### API Security
- The backend API implements rate limiting (Free: 5 req/min, Pro: 20, Premium/Ultra: 60)
- All AI requests are proxied through the backend (never expose Anthropic API key to client)
- Clerk handles authentication - ensure webhook secrets are properly configured
- Stripe webhooks should be verified with webhook secrets

### Production Deployment
- Enable HTTPS for all domains
- Set secure CORS policies
- Keep dependencies updated (`pnpm update`)
- Monitor application logs for suspicious activity
- Use environment-specific configurations (dev, staging, prod)

### Chrome Extension
- Extension ID should be added to Clerk's Allowed Origins
- Only communicate with your own backend API
- Validate all API responses in the extension

## Disclosure Policy

We follow responsible disclosure practices:
- Security issues will be fixed promptly
- Users will be notified through GitHub security advisories
- CVEs will be requested for high-severity vulnerabilities
- We will coordinate with affected parties before public disclosure

## Contact

For non-security-related questions, please open a [GitHub Discussion](https://github.com/ThanosKa/prophet/discussions).
