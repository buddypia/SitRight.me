#!/usr/bin/env bash
# Human-in-the-loop reproduction loop for bugs requiring manual human reproduction.
# Copy this file, customize the steps below, and execute.
# The agent executes the script, and the user follows the prompts in their terminal.
#
# Usage:
#   bash hitl-loop.template.sh
#
# Note: This script is intended for interactive terminals (user stdin). If the agent
# runs it non-interactively, read will encounter EOF and exit immediately — in this case,
# the helper explicitly prints HITL_ERROR to stderr and exits with code 2.
# The agent should guide the user to "execute directly in terminal".
#
# Two helpers:
#   step "<instruction>"    → Displays instruction and waits for Enter
#   capture VAR "<question>" → Displays question and reads response into VAR
#
# At the end, captured values are output in KEY=VALUE format for agent parsing.

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  if ! read -r -p "    [Press Enter when done] " _; then
    printf 'HITL_ERROR=stdin_eof (step: %s) — Must run in interactive terminal\n' "$1" >&2
    exit 2
  fi
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  if ! read -r -p "    > " answer; then
    printf 'HITL_ERROR=stdin_eof (capture: %s) — Must run in interactive terminal\n' "$var" >&2
    exit 2
  fi
  printf -v "$var" '%s' "$answer"
}

# --- Customize below ---------------------------------------------------------

step "Open the app at http://localhost:3000 and log in."

capture ERRORED "Click the 'Export' button. Did an error occur? (y/n)"

capture ERROR_MSG "Paste error message (or 'none' if none):"

# --- Customize above ---------------------------------------------------------

printf '\n--- Capture Results ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"

