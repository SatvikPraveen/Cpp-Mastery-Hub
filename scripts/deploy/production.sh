#!/bin/bash
set -e

echo "🚀 Deploying C++ Mastery Hub to Production Environment..."

# Confirm production deployment
read -p "⚠️  Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Production deployment cancelled."
    exit 1
fi

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '#' | xargs)
fi

# Create backup of current production
echo "💾 Creating production backup..."
kubectl create backup production-backup-$(date +%Y%m%d-%H%M%S) -n cpp-mastery-production

# Build and tag production images
echo "📦 Building production images..."
docker-compose -f docker-compose.prod.yml build

docker tag cppmastery/frontend:latest $DOCKER_REGISTRY/cppmastery/frontend:$RELEASE_VERSION
docker tag cppmastery/backend:latest $DOCKER_REGISTRY/cppmastery/backend:$RELEASE_VERSION
docker tag cppmastery/cpp-engine:latest $DOCKER_REGISTRY/cppmastery/cpp-engine:$RELEASE_VERSION

# Push to registry
echo "📤 Pushing production images..."
docker push $DOCKER_REGISTRY/cppmastery/frontend:$RELEASE_VERSION
docker push $DOCKER_REGISTRY/cppmastery/backend:$RELEASE_VERSION
docker push $DOCKER_REGISTRY/cppmastery/cpp-engine:$RELEASE_VERSION

# Database migrations
echo "🗄️ Running database migrations..."
kubectl exec -it deployment/backend-production -n cpp-mastery-production -- npm run db:migrate:prod

# Rolling deployment
echo "🔄 Starting rolling deployment..."
kubectl set image deployment/frontend-production frontend=$DOCKER_REGISTRY/cppmastery/frontend:$RELEASE_VERSION -n cpp-mastery-production
kubectl set image deployment/backend-production backend=$DOCKER_REGISTRY/cppmastery/backend:$RELEASE_VERSION -n cpp-mastery-production
kubectl set image deployment/cpp-engine-production cpp-engine=$DOCKER_REGISTRY/cppmastery/cpp-engine:$RELEASE_VERSION -n cpp-mastery-production

# Wait for rollout
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/frontend-production -n cpp-mastery-production
kubectl rollout status deployment/backend-production -n cpp-mastery-production
kubectl rollout status deployment/cpp-engine-production -n cpp-mastery-production

# Health checks
echo "🏥 Running health checks..."
timeout 300 bash -c 'until curl -f https://api.cppmastery.hub/health; do sleep 5; done'
timeout 300 bash -c 'until curl -f https://cppmastery.hub; do sleep 5; done'

# Run production smoke tests
echo "🧪 Running production smoke tests..."
npm run test:e2e -- --config=playwright.production.config.ts

# Send deployment notification
echo "📧 Sending deployment notification..."
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  --data '{"text":"🚀 C++ Mastery Hub '$RELEASE_VERSION' successfully deployed to production!"}'

echo "✅ Production deployment completed successfully!"
echo "🌐 Production URL: https://cppmastery.hub"
echo "📊 Monitoring: https://monitoring.cppmastery.hub"
