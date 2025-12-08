#!/bin/sh

# =============================================================================
# ENTRYPOINT: Inject Runtime Environment Variables to Static Build
# =============================================================================
# This script replaces placeholder values in the built JS files with actual
# runtime environment variables from the container environment.
# =============================================================================

set -e

echo "🚀 Starting entrypoint script..."
# Default values if not set
VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-""}
VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-""}
VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID:-""}
VITE_AGENT_API_URL=${VITE_AGENT_API_URL:-""}

# Validate required environment variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ] || [ -z "$VITE_AGENT_API_URL" ]; then
    echo "❌ ERROR: Required environment variables are not set!"
    echo "   VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
    echo "   VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY:0:20}..."
    echo "   VITE_AGENT_API_URL: $VITE_AGENT_API_URL"
    echo ""
    echo "Please set the following environment variables:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_PUBLISHABLE_KEY"
    echo "  - VITE_AGENT_API_URL"
    exit 1
fi

echo "✅ Environment variables validated"
echo "   VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "   VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY:0:20}..."
echo "   VITE_AGENT_API_URL: $VITE_AGENT_API_URL"

# Create runtime config script
cat > /usr/share/nginx/html/runtime-config.js <<EOF
// Runtime Configuration
// This file is generated at container startup from environment variables
window.__RUNTIME_CONFIG__ = {
  VITE_SUPABASE_URL: "$VITE_SUPABASE_URL",
  VITE_SUPABASE_PUBLISHABLE_KEY: "$VITE_SUPABASE_PUBLISHABLE_KEY",
  VITE_SUPABASE_PROJECT_ID: "$VITE_SUPABASE_PROJECT_ID",
  VITE_AGENT_API_URL: "$VITE_AGENT_API_URL"
};
console.log('✅ Runtime config loaded');
EOF

# Replace placeholders in all JS files
echo "🔄 Replacing placeholders in JS bundles..."
find /usr/share/nginx/html/assets -type f -name '*.js' -exec sed -i \
    -e "s@__SUPABASE_URL_PLACEHOLDER__@$VITE_SUPABASE_URL@g" \
    -e "s@__SUPABASE_KEY_PLACEHOLDER__@$VITE_SUPABASE_PUBLISHABLE_KEY@g" \
    -e "s@__SUPABASE_PROJECT_ID_PLACEHOLDER__@$VITE_SUPABASE_PROJECT_ID@g" \
    -e "s@__AGENT_API_URL_PLACEHOLDER__@$VITE_AGENT_API_URL@g" \
    {} +

echo "✅ Placeholders replaced successfully"

echo ""
echo "🎉 Configuration complete! Starting nginx..."
echo "================================================"

# Execute the CMD from Dockerfile
exec "$@"
