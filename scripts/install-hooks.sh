#!/bin/bash

# Installation script for Lefthook git hooks

echo "🪝 Setting up Lefthook git hooks..."

# Check if lefthook is installed
if ! command -v lefthook &> /dev/null; then
    echo "📦 Lefthook is not installed. Installing..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install lefthook
        else
            echo "❌ Homebrew not found. Please install Lefthook manually:"
            echo "   brew install lefthook"
            echo "   or visit: https://github.com/evilmartians/lefthook"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v snap &> /dev/null; then
            sudo snap install --classic lefthook
        else
            echo "📥 Downloading Lefthook binary..."
            curl -sSfL https://raw.githubusercontent.com/evilmartians/lefthook/master/install.sh | sh -s
        fi
    else
        echo "❌ Unsupported OS. Please install Lefthook manually:"
        echo "   https://github.com/evilmartians/lefthook#installation"
        exit 1
    fi
fi

# Install git hooks
echo "🔧 Installing git hooks..."
if lefthook install; then
    echo "✅ Lefthook installed successfully!"
    echo ""
    echo "📋 Active hooks:"
    echo "  • pre-commit: format, lint, type-check, secrets scan"
    echo "  • commit-msg: conventional commits validation"
    echo "  • pre-push: run tests and build"
    echo ""
    echo "💡 Useful commands:"
    echo "  • Run all hooks: lefthook run pre-commit"
    echo "  • Run specific hook: lefthook run pre-commit lint"
    echo "  • Skip hooks: git commit --no-verify"
    echo "  • Uninstall hooks: lefthook uninstall"
else
    echo "❌ Failed to install Lefthook hooks"
    exit 1
fi