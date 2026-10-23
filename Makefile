

# --- brief2dev transplant-bundle (auto-managed targets) ---
.PHONY: wt.new wt.run q.check q.check.full q.scratchpad q.fix

wt.new:
	@if [ -z "$(BR)" ]; then \
		echo "❌ wt.new: BR=<branch> required. Example: make wt.new BR=feature/<task>"; \
		exit 2; \
	fi
	@node .claude/scripts/worktree-new.mjs --branch $(BR) $(if $(BASE),--base $(BASE)) $(if $(DRY),--dry-run)

wt.run:
	@if [ "$(origin CMD)" != "command line" ] || [ -z "$$CMD" ]; then \
		echo "❌ wt.run: CMD=\"<command>\" required. Example: make wt.run CMD=\"npm run test\" [WT=.worktrees/<branch>]"; \
		exit 2; \
	fi
	@node .claude/scripts/wt-run.mjs $(if $(filter command line,$(origin WT)),--worktree "$$WT") "$$CMD"

q.check:
	@rm -f .tmp/quality-gate-passed
	@mkdir -p .tmp
	@node scripts/verify-gate.mjs $(if $(FULL),--full) $(if $(BASE),--base $(BASE))
	@touch .tmp/quality-gate-passed
	@echo "✅ Quality Gate PASSED"

q.check.full:
	@$(MAKE) q.check FULL=1

q.scratchpad:
	@node scripts/agent-scratchpad.mjs $(or $(ACT),status)

q.fix:
	@npx eslint --fix .

# --- end brief2dev transplant-bundle ---
