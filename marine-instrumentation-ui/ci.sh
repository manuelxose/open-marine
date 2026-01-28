#!/bin/bash
# OMI UI CI Script

set -e

echo "Starting CI Pipeline..."

echo "1. Linting..."
npm run lint

echo "2. Testing..."
npm run test -- --watch=false --browsers=ChromeHeadless

echo "3. Building..."
npm run build

echo "CI Pipeline Completed Successfully!"
