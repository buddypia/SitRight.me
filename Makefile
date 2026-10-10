

# --- brief2dev transplant-bundle (auto-managed targets) ---
.PHONY: wt.new wt.run q.check

wt.new:
	@if [ -z "$(BR)" ]; then \
		echo "❌ wt.new: BR=<branch> required. Example: make wt.new BR=feature/<task>"; \
		exit 2; \
	fi
	@node .claude/scripts/worktree-new.mjs --branch $(BR) $(if $(BASE),--base $(BASE)) $(if $(DRY),--dry-run)

wt.run:
	@if [ -z "$(CMD)" ]; then \
		echo "❌ wt.run: CMD=\"<command>\" required. Example: make wt.run CMD=\"npm run test\""; \
		exit 2; \
	fi
	@node .claude/scripts/wt-run.mjs $(CMD)

q.check:
	@rm -f .tmp/quality-gate-passed
	@mkdir -p .tmp
	@echo ">> npm run lint" && npm run lint
	@echo ">> npm run test" && npm run test
	@echo ">> npm run build" && npm run build
	@touch .tmp/quality-gate-passed
	@echo "✅ Quality Gate PASSED"

# --- end brief2dev transplant-bundle ---
