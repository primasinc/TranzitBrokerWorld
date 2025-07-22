#!/bin/bash

# Production Deployment Script for Tranzit.io
# This script ensures all components are properly deployed and validated

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# 1. Deploy Firestore Rules
echo "📋 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# 2. Deploy Cloud Functions
echo "⚡ Deploying Cloud Functions..."
firebase deploy --only functions

# 3. Deploy Hosting
echo "🌐 Deploying web application..."
firebase deploy --only hosting

# 4. Deploy Storage Rules
echo "📦 Deploying Storage rules..."
firebase deploy --only storage

# 5. Validate deployment
echo "✅ Validating deployment..."

# Check if functions are deployed
FUNCTIONS_STATUS=$(firebase functions:list --token "$(firebase login:ci --no-localhost)")
if [[ $FUNCTIONS_STATUS == *"onPartnerRequestCreate"* ]]; then
    echo "✅ Cloud Functions deployed successfully"
else
    echo "❌ Cloud Functions deployment failed"
    exit 1
fi

# Check if rules are deployed
RULES_STATUS=$(firebase firestore:rules:get)
if [[ $RULES_STATUS == *"isValidLoadState"* ]]; then
    echo "✅ Firestore rules deployed successfully"
else
    echo "❌ Firestore rules deployment failed"
    exit 1
fi

echo "🎉 Production deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "- Firestore Rules: ✅"
echo "- Cloud Functions: ✅"
echo "- Web Application: ✅"
echo "- Storage Rules: ✅"
echo ""
echo "🔍 Next Steps:"
echo "1. Test partner request workflow"
echo "2. Verify marketplace filtering"
echo "3. Monitor Cloud Function logs"
echo "4. Check data consistency" 