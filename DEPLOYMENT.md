# Deployment Guide

This guide covers how to deploy the Ebook Reader application to various platforms.

## Build for Production

```bash
# Build the TypeScript code
npm run build

# The output will be in the `dist/` directory
```

## Static Site Deployment

The demo application can be deployed as a static site. Here are popular options:

### Netlify

1. Create a `netlify.toml` file:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
```

2. Connect your repository to Netlify
3. Deploy automatically on push to main branch

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`
3. Follow the prompts to configure your project

### GitHub Pages

1. Build the project: `npm run build`
2. Create `gh-pages` branch: `git checkout --orphan gh-pages`
3. Copy built files: `cp -r dist/* .`
4. Commit and push: `git add . && git commit -m "Deploy to GitHub Pages" && git push origin gh-pages`
5. Enable GitHub Pages in repository settings

### Surge.sh

```bash
npm run build
npm install -g surge
cd dist
surge --domain your-app.surge.sh
```

## Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen       80;
        server_name  localhost;

        location / {
            root   /usr/share/nginx/html;
            index  index.html index.htm;
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

Build and run:

```bash
docker build -t ebook-reader .
docker run -p 80:80 ebook-reader
```

## Environment Variables

The application supports these environment variables:

- `NODE_ENV` - Set to 'production' for production builds
- `PORT` - Port for the development server (default: 3000)

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run lint
    - run: npm run typecheck
    - run: npm test
    - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run build
    - name: Deploy to Netlify
      uses: netlify/actions/cli@master
      with:
        args: deploy --dir=dist --prod
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Performance Optimization

### Before Deployment

1. **Minimize Assets**: Use build tools to minify CSS and JS
2. **Enable Compression**: Configure server to use gzip/brotli
3. **CDN**: Use a CDN for static assets
4. **Caching**: Set appropriate cache headers
5. **Bundle Analysis**: Use `npm run build:analyze` to check bundle size

### Server Configuration

#### Nginx
```nginx
# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### Apache
```apache
# Enable compression
LoadModule deflate_module modules/mod_deflate.so
<Location />
    SetOutputFilter DEFLATE
    SetEnvIfNoCase Request_URI \
        \.(?:gif|jpe?g|png)$ no-gzip dont-vary
    SetEnvIfNoCase Request_URI \
        \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
</Location>

# Cache static assets
<LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</LocationMatch>
```

## Monitoring

### Health Checks

Add health check endpoints:

```typescript
// health.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

app.get('/health/ready', async (req, res) => {
  // Check database connectivity
  const dbStatus = await checkDatabase();
  
  res.json({
    status: dbStatus ? 'ready' : 'not-ready',
    database: dbStatus ? 'connected' : 'disconnected'
  });
});
```

### Error Tracking

Integrate with error tracking services:

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
});

// Error boundaries in React
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error, errorInfo) => {
    Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }}
>
  <App />
</ErrorBoundary>
```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CSP**: Implement Content Security Policy headers
3. **Dependencies**: Regularly audit dependencies with `npm audit`
4. **Environment Variables**: Never commit sensitive data
5. **Input Validation**: Validate all user inputs

## Troubleshooting

### Common Issues

1. **Build Fails**: Check Node.js version compatibility
2. **E2E Tests Fail**: Ensure Playwright browsers are installed
3. **Deploy Errors**: Check environment variables and build configuration
4. **Performance**: Use browser dev tools to profile and optimize

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run dev
DEBUG=ebook-reader:* npm run dev
```

This deployment guide covers the most common deployment scenarios. Adjust based on your specific hosting provider and requirements.