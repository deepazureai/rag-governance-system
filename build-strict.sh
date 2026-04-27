#!/bin/bash

echo "=========================================="
echo "Building Frontend with Strict TypeScript"
echo "=========================================="

cd /vercel/share/v0-project
echo "Current directory: $(pwd)"
echo "Running: pnpm tsc --noEmit --strict"
pnpm tsc --noEmit --strict

FRONTEND_EXIT=$?

if [ $FRONTEND_EXIT -ne 0 ]; then
    echo ""
    echo "FRONTEND BUILD FAILED - TypeScript errors detected"
    echo ""
else
    echo ""
    echo "FRONTEND BUILD SUCCESS - No TypeScript errors"
    echo ""
fi

echo ""
echo "=========================================="
echo "Building Backend with Strict TypeScript"
echo "=========================================="

cd /vercel/share/v0-project/backend
echo "Current directory: $(pwd)"
echo "Running: pnpm tsc --noEmit --strict"
pnpm tsc --noEmit --strict

BACKEND_EXIT=$?

if [ $BACKEND_EXIT -ne 0 ]; then
    echo ""
    echo "BACKEND BUILD FAILED - TypeScript errors detected"
    echo ""
else
    echo ""
    echo "BACKEND BUILD SUCCESS - No TypeScript errors"
    echo ""
fi

echo "=========================================="
echo "BUILD SUMMARY"
echo "=========================================="

if [ $FRONTEND_EXIT -eq 0 ] && [ $BACKEND_EXIT -eq 0 ]; then
    echo "✓ FRONTEND: PASSED"
    echo "✓ BACKEND: PASSED"
    echo ""
    echo "ALL BUILDS PASSED - System is ready for deployment"
    exit 0
else
    [ $FRONTEND_EXIT -ne 0 ] && echo "✗ FRONTEND: FAILED"
    [ $FRONTEND_EXIT -eq 0 ] && echo "✓ FRONTEND: PASSED"
    [ $BACKEND_EXIT -ne 0 ] && echo "✗ BACKEND: FAILED"
    [ $BACKEND_EXIT -eq 0 ] && echo "✓ BACKEND: PASSED"
    echo ""
    echo "SOME BUILDS FAILED - See errors above"
    exit 1
fi
