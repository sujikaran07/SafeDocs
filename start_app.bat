@echo off
echo Starting SafeDocs...
start "SafeDocs Engine" cmd /k "cd platform && npm run engine:dev"
start "SafeDocs Platform" cmd /k "cd platform && npm run dev"
echo Done! App will be running at http://localhost:3000
