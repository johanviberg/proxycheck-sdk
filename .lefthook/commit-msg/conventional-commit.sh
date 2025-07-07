#!/bin/bash

# Conventional Commits Validator for Lefthook
# https://www.conventionalcommits.org/

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Read the commit message
commit_msg_file="$1"
commit_msg=$(cat "$commit_msg_file")

# Define the conventional commit regex
# Format: <type>(<scope>): <subject>
# The scope is optional
commit_regex='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_-]+\))?: .{1,72}$'

# Check for breaking change footer
breaking_change_regex='BREAKING CHANGE:'

# Validate the commit message
if ! echo "$commit_msg" | head -1 | grep -qE "$commit_regex"; then
  echo -e "${RED}❌ Invalid commit message format!${NC}"
  echo ""
  echo -e "${YELLOW}Your commit message:${NC}"
  echo "$commit_msg"
  echo ""
  echo -e "${BLUE}Expected format:${NC} <type>(<scope>): <subject>"
  echo ""
  echo -e "${GREEN}Allowed types:${NC}"
  echo "  • feat     - A new feature"
  echo "  • fix      - A bug fix"
  echo "  • docs     - Documentation only changes"
  echo "  • style    - Changes that don't affect code meaning (white-space, formatting, etc)"
  echo "  • refactor - Code change that neither fixes a bug nor adds a feature"
  echo "  • perf     - Performance improvement"
  echo "  • test     - Adding missing tests or correcting existing tests"
  echo "  • build    - Changes that affect the build system or external dependencies"
  echo "  • ci       - Changes to CI configuration files and scripts"
  echo "  • chore    - Other changes that don't modify src or test files"
  echo "  • revert   - Reverts a previous commit"
  echo ""
  echo -e "${GREEN}Optional scopes for this project:${NC}"
  echo "  • check    - Check service"
  echo "  • listing  - Listing service"
  echo "  • rules    - Rules service"
  echo "  • stats    - Stats service"
  echo "  • client   - Main client"
  echo "  • config   - Configuration"
  echo "  • http     - HTTP client"
  echo "  • errors   - Error handling"
  echo "  • types    - TypeScript types"
  echo "  • deps     - Dependencies"
  echo ""
  echo -e "${GREEN}Examples:${NC}"
  echo "  • feat(check): add batch IP validation support"
  echo "  • fix: correct rate limit retry logic"
  echo "  • docs(readme): update installation instructions"
  echo "  • test(client): add integration tests for error handling"
  echo "  • chore(deps): update typescript to v5.3"
  echo ""
  echo -e "${YELLOW}Tips:${NC}"
  echo "  • Keep the subject line under 72 characters"
  echo "  • Use imperative mood (\"add\" not \"added\")"
  echo "  • Don't end with a period"
  echo "  • Separate subject from body with a blank line"
  echo "  • Use 'BREAKING CHANGE:' footer for breaking changes"
  exit 1
fi

# Check subject line length (first line)
first_line=$(echo "$commit_msg" | head -1)
if [ ${#first_line} -gt 100 ]; then
  echo -e "${YELLOW}⚠️  Warning: Subject line is ${#first_line} characters (recommended: <72)${NC}"
fi

# If validation passed
echo -e "${GREEN}✅ Commit message follows Conventional Commits format${NC}"

# Check for breaking changes
if echo "$commit_msg" | grep -q "$breaking_change_regex"; then
  echo -e "${YELLOW}⚠️  This commit contains BREAKING CHANGES${NC}"
fi

exit 0