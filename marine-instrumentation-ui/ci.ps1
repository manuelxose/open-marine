# OMI UI CI Script (PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "Starting CI Pipeline..." -ForegroundColor Cyan

Write-Host "1. Linting..." -ForegroundColor Yellow
npm run lint

Write-Host "2. Testing..." -ForegroundColor Yellow
npm run test -- --watch=false --browsers=ChromeHeadless

Write-Host "3. Building..." -ForegroundColor Yellow
npm run build

Write-Host "CI Pipeline Completed Successfully!" -ForegroundColor Green
