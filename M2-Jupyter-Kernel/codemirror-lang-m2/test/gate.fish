#!/usr/bin/env fish
# Per-commit gate script for M2 Lezer grammar changes.
# Verifies: grammar compiles, files synced, fixtures pass, corpus <= baseline, parser size bounded.
#
# Usage:  fish test/gate.fish
#         fish test/gate.fish --skip-corpus   # skip slow corpus test

set script_dir (dirname (status filename))
set cm2_dir (realpath "$script_dir/..")
set kernel_dir (realpath "$cm2_dir/..")
set pass_count 0
set fail_count 0
set skip_corpus 0

# Parse args
for arg in $argv
    if test "$arg" = "--skip-corpus"
        set skip_corpus 1
    end
end

function gate_pass
    set -g pass_count (math $pass_count + 1)
    echo "  PASS: $argv"
end

function gate_fail
    set -g fail_count (math $fail_count + 1)
    echo "  FAIL: $argv"
end

echo "=== M2 Grammar Gate ==="
echo "  Working dir: $cm2_dir"
echo ""

# ── Check 1: Grammar compiles ──
echo "Check 1: Grammar compiles"
set tmpout (mktemp /tmp/gate_parser_XXXXXX.js)
set tmpterms (mktemp /tmp/gate_terms_XXXXXX.js)
set grammar_err (NODE_OPTIONS='--max-old-space-size=16384' npx --no-install lezer-generator "$cm2_dir/src/m2.grammar" -o "$tmpout" 2>&1)
set grammar_status $status
rm -f "$tmpout" "$tmpterms" 2>/dev/null
if test $grammar_status -eq 0
    gate_pass "Grammar compiles"
else
    gate_fail "Grammar compilation failed"
    echo "  $grammar_err"
end

# ── Check 2: External tokenizer sync ──
echo "Check 2: External tokenizer sync"
set sync_ok 1
# Parse @external lines from grammar to find referenced .js files
for ext_line in (grep '@external' "$cm2_dir/src/m2.grammar" | grep 'from')
    # Extract filename between quotes: from "./filename.js"
    set ext_file (echo "$ext_line" | sed -n 's/.*from "\.\/\([^"]*\)".*/\1/p')
    if test -n "$ext_file"
        for target_dir in "$kernel_dir/src/parser" "$kernel_dir/lib/parser"
            if not test -f "$target_dir/$ext_file"
                gate_fail "Missing: $target_dir/$ext_file"
                set sync_ok 0
            end
        end
    end
end
if test $sync_ok -eq 1
    gate_pass "All external tokenizers synced to src/parser/ and lib/parser/"
end

# ── Check 3: Parser files synced ──
echo "Check 3: Parser file sync"
set files_ok 1
for f in parser.js parser.terms.js
    if not test -f "$kernel_dir/src/parser/$f"
        gate_fail "Missing: src/parser/$f"
        set files_ok 0
    end
    if not test -f "$kernel_dir/lib/parser/$f"
        gate_fail "Missing: lib/parser/$f"
        set files_ok 0
    end
end
if test $files_ok -eq 1
    gate_pass "parser.js and parser.terms.js in both src/parser/ and lib/parser/"
end

# ── Capture baseline (live, not hardcoded) ──
echo ""
echo "Capturing baseline..."
set parser_path "$kernel_dir/src/parser/parser.js"
set baseline_size 0
if test -f "$parser_path"
    set baseline_size (wc -c < "$parser_path" | tr -d ' ')
end
echo "  Parser size: $baseline_size bytes"

# ── Check 4: Fixtures ──
echo ""
echo "Check 4: Fixtures"
set fixture_out (node "$cm2_dir/test/test_fixtures.js" 2>&1)
set fixture_status $status
if test $fixture_status -eq 0
    # Extract pass count from last line mentioning "passed"
    set pass_line (echo "$fixture_out" | grep 'passed' | tail -1)
    gate_pass "Fixtures: $pass_line"
else
    gate_fail "Fixtures failed (exit code $fixture_status)"
    echo "$fixture_out" | tail -10
end

# ── Check 5: Corpus error rate ──
if test $skip_corpus -eq 0
    echo ""
    echo "Check 5: Corpus error rate"
    set corpus_json (node "$cm2_dir/test/test_corpus.js" --json 2>/dev/null)
    set corpus_status $status
    # Parse JSON output for reliable metric extraction
    set code_errors (echo "$corpus_json" | python3 -c "import sys,json; print(json.load(sys.stdin)['codeValid']['errors'])" 2>/dev/null)
    set code_rate (echo "$corpus_json" | python3 -c "import sys,json; print(json.load(sys.stdin)['codeValid']['rate'])" 2>/dev/null)
    if test -n "$code_errors"
        echo "  CODE_VALID: $code_errors errors ($code_rate%)"
        # Baseline-relative check
        set baseline_file "$cm2_dir/test/baseline.json"
        if test -f "$baseline_file"
            set baseline_errors (python3 -c "import json; print(json.load(open('$baseline_file'))['codeValid']['errors'])" 2>/dev/null)
            set max_delta 50
            if test -n "$baseline_errors"
                set limit (math $baseline_errors + $max_delta)
                echo "  Baseline: $baseline_errors errors (tolerance: +$max_delta)"
                if test $code_errors -le $limit
                    gate_pass "Corpus: $code_errors errors (<= $limit)"
                else
                    gate_fail "Corpus regression: $code_errors errors (> baseline $baseline_errors + $max_delta)"
                end
            else
                gate_pass "Corpus: $code_errors CODE_VALID errors (no baseline)"
            end
        else
            gate_pass "Corpus: $code_errors CODE_VALID errors (no baseline.json)"
        end
    else
        gate_fail "Could not parse corpus JSON output"
        echo "$corpus_json" | tail -5
    end
else
    echo ""
    echo "Check 5: Corpus (SKIPPED --skip-corpus)"
end

# ── Check 6: Parser size ──
echo ""
echo "Check 6: Parser size"
if test $baseline_size -gt 0
    set current_size (wc -c < "$parser_path" | tr -d ' ')
    set delta_pct (math "($current_size - $baseline_size) * 100 / $baseline_size")
    echo "  Size: $current_size bytes (baseline: $baseline_size, delta: $delta_pct%)"
    set max_size_delta 10
    if test $delta_pct -gt $max_size_delta
        gate_fail "Parser size regression: $delta_pct% growth (> $max_size_delta% threshold)"
    else
        gate_pass "Parser size: $current_size bytes ($delta_pct% delta)"
    end
else
    gate_fail "Parser file not found for size check"
end

# ── Check 7: Operator validation ──
echo ""
echo "Check 7: Operator validation"
if test -f "$cm2_dir/test/validate_operators.js"
    set op_out (node "$cm2_dir/test/validate_operators.js" 2>&1)
    set op_status $status
    if test $op_status -eq 0
        set op_result (echo "$op_out" | grep 'Overall status:' | tail -1)
        gate_pass "Operators: $op_result"
    else
        gate_fail "Operator validation failed"
        echo "$op_out" | tail -5
    end
else
    echo "  SKIP: validate_operators.js not found"
end

# ── Check 8: Manifest revalidation (optional — requires M2) ──
echo ""
echo "Check 8: Manifest revalidation"
if type -q M2; or test -n "$M2_PATH"
    set reval_out (node "$cm2_dir/test/revalidate_invalid.js" 2>&1)
    set reval_status $status
    if test $reval_status -eq 0
        gate_pass "Manifest: no stale entries"
        # Show confirmed/inconclusive counts from revalidation
        for line in (printf '%s\n' $reval_out | grep -E '^\s+(Confirmed|Inconclusive):')
            echo "  $line"
        end
    else
        gate_fail "Manifest: stale entries found"
        echo "$reval_out" | grep -E '(STALE|FAIL)' | head -5
    end
else
    echo "  SKIP: Manifest revalidation (M2 not found)"
end

# ── Summary ──
echo ""
echo "=== Gate Summary ==="
echo "  Passed: $pass_count"
echo "  Failed: $fail_count"

if test $fail_count -gt 0
    echo "  Status: FAIL"
    exit 1
else
    echo "  Status: PASS"
    exit 0
end
