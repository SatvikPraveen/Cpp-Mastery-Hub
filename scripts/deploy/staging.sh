#!/bin/bash
set -e

echo "🚀 Deploying C++ Mastery Hub to Staging Environment..."

# Load environment variables
if [ -f .env.staging ]; then
    export $(cat .env.staging | grep -v '#' | xargs)
fi

# Build Docker images
echo "📦 Building Docker images..."
docker-compose -f docker-compose.staging.yml build

# Tag images for registry
echo "🏷️ Tagging images..."
docker tag cppmastery/frontend:latest $DOCKER_REGISTRY/cppmastery/frontend:staging
docker tag cppmastery/backend:latest $DOCKER_REGISTRY/cppmastery/backend:staging
docker tag cppmastery/cpp-engine:latest $DOCKER_REGISTRY/cppmastery/cpp-engine:staging

# Push to registry
echo "📤 Pushing images to registry..."
docker push $DOCKER_REGISTRY/cppmastery/frontend:staging
docker push $DOCKER_REGISTRY/cppmastery/backend:staging
docker push $DOCKER_REGISTRY/cppmastery/cpp-engine:staging

# Deploy to staging
echo "🚀 Deploying to staging..."
kubectl apply -f k8s/staging/

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/frontend-staging -n cpp-mastery-staging
kubectl rollout status deployment/backend-staging -n cpp-mastery-staging
kubectl rollout status deployment/cpp-engine-staging -n cpp-mastery-staging

# Run smoke tests
echo "🧪 Running smoke tests..."
npm run test:e2e -- --config=playwright.staging.config.ts

echo "✅ Staging deployment completed successfully!"
echo "🌐 Staging URL: https://staging.cppmastery.hub"
