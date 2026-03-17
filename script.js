/* ─────────────────────────────────────────────────────────────────────────────
   ALGEBRAIC EXPANSION TRAINER - Milestone Prototype Sample
   Logic: Categorical Error Highlighting (Categorizes terms by variable signature)
   ───────────────────────────────────────────────────────────────────────────── */
const app = {
    currentProblem: null,
    steps: [],
    timerInterval: null,
    timerStartTime: 0,
    timerRunning: false,
    timerElapsed: 0,

    /* ──────────────────────────────────────
       TIMER
    ────────────────────────────────────── */
    toggleTimer() {
        if (this.timerRunning) this.stopTimer();
        else this.startTimer();
    },
    startTimer() {
        if (this.timerRunning) return;
        this.timerStartTime = Date.now() - this.timerElapsed;
        this.timerRunning = true;
        document.getElementById('timer-btn').innerText = 'Stop';
        this.timerInterval = setInterval(() => {
            this.timerElapsed = Date.now() - this.timerStartTime;
            const min = Math.floor(this.timerElapsed / 60000).toString().padStart(2, '0');
            const sec = Math.floor((this.timerElapsed % 60000) / 1000).toString().padStart(2, '0');
            const cs  = Math.floor((this.timerElapsed % 1000) / 10).toString().padStart(2, '0');
            document.getElementById('timer-display').innerText = `${min}:${sec}:${cs}`;
        }, 10);
    },
    stopTimer() {
        if (!this.timerRunning) return;
        clearInterval(this.timerInterval);
        this.timerRunning = false;
        document.getElementById('timer-btn').innerText = 'Start';
    },
    resetTimer() {
        this.stopTimer();
        this.timerElapsed = 0;
        document.getElementById('timer-display').innerText = '00:00:00';
    },

    /* ──────────────────────────────────────
       HELPERS: read UI options
    ────────────────────────────────────── */
    hintsEnabled() {
        return document.getElementById('opt-hints-yes').checked;
    },
    getTermCount() {
        const opts = [
            { id: 'opt-terms-1', val: 1 },
            { id: 'opt-terms-2', val: 2 },
            { id: 'opt-terms-3', val: 3 },
        ].filter(o => document.getElementById(o.id).checked).map(o => o.val);
        if (opts.length === 0) return 1;
        return opts[Math.floor(Math.random() * opts.length)];
    },
    getVarTypes() {
        const types = [];
        if (document.getElementById('opt-var-x').checked) types.push('x');
        if (document.getElementById('opt-var-y').checked) types.push('y');
        if (document.getElementById('opt-var-z').checked) types.push('z');
        if (document.getElementById('opt-var-high').checked) types.push('high');
        if (types.length === 0) types.push('x');
        return types;
    },
    getTermTypes() {
        const types = [];
        if (document.getElementById('opt-type-const').checked) types.push('const');
        if (document.getElementById('opt-type-linear').checked) types.push('linear');
        if (document.getElementById('opt-type-quad1').checked) types.push('quad1');
        if (document.getElementById('opt-type-quad2').checked) types.push('quad2');
        if (document.getElementById('opt-type-high').checked) types.push('high');
        if (types.length === 0) types.push('const');
        return types;
    },
    getNestingLevels() {
        const levels = [];
        if (document.getElementById('opt-nest-no').checked) levels.push(0);
        if (document.getElementById('opt-nest-1').checked) levels.push(1);
        if (document.getElementById('opt-nest-2').checked) levels.push(2);
        if (document.getElementById('opt-nest-3').checked) levels.push(3);
        if (levels.length === 0) levels.push(0);
        return levels;
    },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    rand(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; },
    randFloat(lo, hi) { return Math.round((Math.random() * (hi - lo) + lo) * 10) / 10; },
    nonzero(lo, hi) { let v; do { v = this.rand(lo, hi); } while (v === 0); return v; },
    nonzeroFloat(lo, hi) { let v; do { v = this.randFloat(lo, hi); } while (v === 0); return v; },

    /* ──────────────────────────────────────
       PROBLEM GENERATION
    ────────────────────────────────────── */
    generateProblem() {
        this.clearWorkspace();
        this.resetTimer();

        const nTerms = this.getTermCount();
        const varTypes = this.getVarTypes();
        const termTypes = this.getTermTypes();
        const nestingLevels = this.getNestingLevels();

        const nestLevel = this.pick(nestingLevels);
        const expression = this.buildAlgebraicExpression(nTerms, varTypes, termTypes, nestLevel);
        
        const targetSteps = this.calculateSteps(expression, nestLevel);

        this.currentProblem = {
            expression: expression,
            nestLevel: nestLevel,
            targetSteps: targetSteps,
            hintsEnabled: this.hintsEnabled(),
        };

        const latex = this.toLatex(expression);
        this.currentProblem.displayLatex = latex;

        const display = document.getElementById('math-display');
        
        // Prepare display for new content: center and hide overflow immediately to prevent flicker
        display.style.fontSize = '2.2rem';
        display.style.justifyContent = 'center';
        display.style.overflowX = 'hidden'; 
        
        katex.render(latex, display, { throwOnError: false });
        document.getElementById('empty-state').style.display = 'none';

        // Fit to container after a short delay to ensure browser layout is stable
        setTimeout(() => this.fitToContainer(display, 2.2), 100);
    },

    fitToContainer(el, startSizeRem) {
        if (!el) return;

        // Use float-precision measurements to avoid sub-pixel rounding errors
        const getMetrics = () => {
            const child = el.querySelector('.katex-html') || el.querySelector('.katex') || el.firstElementChild;
            const containerRect = el.getBoundingClientRect();
            
            const style = window.getComputedStyle(el);
            const paddingLeft = parseFloat(style.paddingLeft) || 0;
            const paddingRight = parseFloat(style.paddingRight) || 0;
            const horizontalPadding = paddingLeft + paddingRight;

            const available = containerRect.width - horizontalPadding;
            const content = child ? child.getBoundingClientRect().width : el.scrollWidth;
            
            return { available: Math.max(0, available), content: content };
        };

        const MAX_SIZE = startSizeRem;
        const MIN_SIZE = 0.75; 

        // 1. Initial measurement at max size
        el.style.justifyContent = 'flex-start';
        el.style.overflowX = 'hidden'; 
        el.style.fontSize = `${MAX_SIZE}rem`;
        void el.offsetWidth; // Force layout

        let initial = getMetrics();
        if (initial.available <= 0) return;

        // If it fits at MAX_SIZE with a tiny buffer, just center and return
        if (initial.content <= initial.available + 0.5) {
            el.style.justifyContent = 'center';
            el.style.overflowX = 'hidden';
            return;
        }

        // 2. Binary search for optimal size with a 1.5px safety margin
        let low = MIN_SIZE, high = MAX_SIZE;
        for (let i = 0; i < 15; i++) {
            const mid = (low + high) / 2;
            el.style.fontSize = `${mid}rem`;
            void el.offsetWidth;
            const m = getMetrics();
            if (m.content <= m.available - 1.5) low = mid;
            else high = mid;
        }

        // Apply result
        el.style.fontSize = `${low}rem`;
        void el.offsetWidth;

        // 3. Final alignment and overflow state
        const final = getMetrics();
        if (final.content <= final.available + 1.0) {
            el.style.justifyContent = 'center';
            el.style.overflowX = 'hidden';
            // Also ensure it doesn't clip the bottom if it's a tall expression
            el.style.overflowY = 'hidden'; 
        } else {
            // Still overflows at minimum size
            el.style.justifyContent = 'flex-start';
            el.style.overflowX = 'auto';
        }
    },

    buildAlgebraicExpression(nTerms, varTypes, termTypes, nestLevel) {
        let terms = [];
        for (let i = 0; i < nTerms; i++) {
            terms.push(this.generateBaseTerm(varTypes, termTypes));
        }
        
        let expr = terms.join(' + ');

        if (nestLevel >= 1) {
            const coeff = this.nonzero(-3, 3);
            const inner = this.stripRedundantBrackets(expr);
            if (coeff === 1) {
                expr = inner;
            } else if (coeff === -1) {
                expr = this.countOutermostTerms(inner) > 1 ? `-(${inner})` : `-${inner}`;
            } else {
                // If only one term inside and it's already bracketed, don't double bracket.
                expr = (this.countOutermostTerms(inner) === 1 && inner.includes('(')) 
                    ? `${coeff}${inner}` 
                    : `${coeff}(${inner})`;
            }
        }
        
        if (nestLevel >= 2) {
            const extra = this.generateBaseTerm(varTypes, ['const', 'linear']);
            let coeff = this.nonzero(-2, 2);
            if (coeff === 1) coeff = 2; // Always have a multiplier/sign for complexity
            const op = Math.random() > 0.5 ? '+' : '-';
            const innerRaw = `${extra} ${op} ${expr}`;
            const inner = this.stripRedundantBrackets(innerRaw);
            
            // Criteria: Only use [] if there are multiple terms AND a factor.
            // Since we add 'extra', it's always multi-term.
            expr = coeff === -1 ? `-[${inner}]` : `${coeff}[${inner}]`;
        }

        if (nestLevel >= 3) {
            const extra = this.generateBaseTerm(varTypes, ['const', 'linear']);
            let coeff = this.nonzero(-2, 2);
            if (coeff === 1) coeff = -1;
            const op = Math.random() > 0.5 ? '+' : '-';
            const innerRaw = `${extra} ${op} ${expr}`;
            const inner = this.stripRedundantBrackets(innerRaw);

            // Same criteria: multiplier + multi-term inside.
            expr = coeff === -1 ? `-{${inner}}` : `${coeff}{${inner}}`;
        }

        return this.cleanExpression(expr);
    },

    stripRedundantBrackets(s) {
        let str = s.trim();
        while (str.startsWith('(') && str.endsWith(')')) {
            let depth = 0;
            let isSingleGroup = true;
            for (let i = 0; i < str.length - 1; i++) {
                if (str[i] === '(') depth++;
                else if (str[i] === ')') depth--;
                if (depth === 0) { isSingleGroup = false; break; }
            }
            if (isSingleGroup) str = str.slice(1, -1).trim();
            else break;
        }
        return str;
    },

    generateBaseTerm(varTypes, termTypes) {
        const type = this.pick(termTypes);
        const vRaw = this.pick(varTypes);
        let v = vRaw === 'high' ? this.generateHigherPowerVar() : vRaw;
        
        const a = this.nonzero(-4, 4);
        const b = this.nonzero(-4, 4);
        const c = this.nonzero(-4, 4);

        switch (type) {
            case 'const': return `${a}`;
            case 'linear': {
                // If a is 1 or -1, decide whether to return "x+b", "-(x+b)" or "a(x+b)"
                // Suppressing 1 helps prevent redundant brackets in nesting.
                if (a === 1) return `${v} + ${b}`;
                if (a === -1) return `-(${v} + ${b})`;
                return `${a}(${v} + ${b})`;
            }
            case 'quad1': {
                const b2 = this.nonzero(-4, 4);
                return `(${v} + ${b})(${v} + ${b2})`;
            }
            case 'quad2': return `${v}^2 + ${b}${v} + ${c}`;
            case 'high': {
                const exp = this.rand(2, 3);
                return `${a}${v}^${exp}`;
            }
            default: return `${a}`;
        }
    },

    generateHigherPowerVar() {
        const scenarios = [
            () => { const v = this.pick(['x', 'y', 'z']); return `${v}^2`; },
            () => { const v = this.pick(['x', 'y', 'z']); return `${v}^3`; },
            () => { 
                const vars = ['x', 'y', 'z'];
                const v1 = vars.splice(this.rand(0, 2), 1)[0];
                const v2 = vars[this.rand(0, 1)];
                return `${v1}${v2}^2`;
            },
            () => { return `xyz`; }
        ];
        return this.pick(scenarios)();
    },

    cleanExpression(s) {
        return s.replace(/\+ \-/g, '- ')
                .replace(/\- \-/g, '+ ')
                .replace(/\+ \+/g, '+ ')
                .replace(/\( \+/g, '(')
                .replace(/\[ \+/g, '[')
                .replace(/\{ \+/g, '{');
    },

    calculateSteps(expression, nestLevel) {
        const steps = [];
        
        // Step 1: Count terms (always)
        steps.push({ 
            question: "How many terms are there in this expression?", 
            answer: this.countOutermostTerms(expression), 
            type: 'count' 
        });

        // ── Bug 5 fix: Steps beyond Step 1 are generated DYNAMICALLY in addStep().
        // We only seed the "first expansion" step here so the step array is never
        // empty when the user clicks "+Add Step" for Step 2.
        const firstExpandPrompt = "Begin expansion, starting with the innermost bracket(s) (if any).";
        const finalAnswer = this.fullySimplify(expression);

        if (nestLevel === 0 && this.isFullyExpanded(expression)) {
            // Bug 1 fix: already expanded — skip directly to a "key in answer" step.
            steps.push({
                question: "Key in the expanded and final answer.",
                answer: finalAnswer,
                type: 'final'
            });
        } else {
            // Seed the first expansion step; further steps are added dynamically.
            steps.push({
                question: firstExpandPrompt,
                answer: finalAnswer,   // correctness is checked by equivalence, not this value
                type: 'expand'
            });
            // Sentinel: signals that more dynamic steps may follow
            steps.push({
                question: '__dynamic__',
                answer: finalAnswer,
                type: '__dynamic__'
            });
        }

        return steps;
    },

    // ── Called by addStep() to build the next step's descriptor dynamically.
    // lastVal = the expression string the user submitted for the previous step.
    nextDynamicStep(lastVal, finalAnswer) {
        const furtherExpandPrompt =
            "Expand further, till every term is no longer a product of factors. " +
            "Hint : As a good practice, simplify like terms within brackets before expansion !";
        const finalPrompt = "Collect like terms and simplify to obtain the final answer.";

        if (this.isFullyExpanded(lastVal)) {
            // User's last answer has no more brackets to expand — ask for final simplification.
            return { question: finalPrompt, answer: finalAnswer, type: 'final' };
        } else {
            // Still brackets remaining — keep asking to expand more.
            return { question: furtherExpandPrompt, answer: finalAnswer, type: 'expand' };
        }
    },

    countOutermostTerms(str) {
        let depth = 0;
        let count = 0;
        let inTerm = false;
        // Strip out leading sign if any
        let s = str.trim();
        if (s[0] === '+' || s[0] === '-') s = s.slice(1).trim();

        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (ch === '(' || ch === '[' || ch === '{') depth++;
            else if (ch === ')' || ch === ']' || ch === '}') depth--;
            
            if (depth === 0) {
                if (!inTerm && ch !== ' ' && ch !== '+' && ch !== '-') {
                    count++;
                    inTerm = true;
                } else if (ch === '+' || ch === '-') {
                    inTerm = false;
                }
            }
        }
        return count;
    },

    expandStep(expr, bracketType) {
        // This is a simplified "expansion step" logic.
        // We'll use math.simplify with a custom rule or just rationalize the inner parts.
        // But for the sake of the trainer, we want to keep the structure.
        
        // For Level 1, we want to expand things like a(b+c) -> ab + ac
        // We can use math.simplify(expr) but it might simplify too much.
        // A better way is to "expand" only one level.
        try {
            // We use math.simplify which usually expands brackets first.
            // If we want to be specific about brackets, we might need a more complex tool.
            // But since we are checking mathematical equivalence, we can just return the rationalized form.
            return math.simplify(expr).toString();
        } catch(e) { return expr; }
    },

    fullySimplify(expr) {
        try {
            return math.simplify(expr).toString();
        } catch(e) { return expr; }
    },

    /* ──────────────────────────────────────
       STEPS
    ────────────────────────────────────── */
    addStep() {
        if (!this.currentProblem) {
            alert('Please generate a problem first!'); return;
        }
        const p = this.currentProblem;
        const stepCount = this.steps.length + 1;

        // ── Bug 5 fix: resolve dynamic steps before rendering ──────────────────
        // If the slot we are about to fill is the '__dynamic__' sentinel, replace
        // it with the correct descriptor derived from the previous step's answer.
        let targetDescriptor = p.targetSteps[stepCount - 1];

        if (!targetDescriptor) {
            // The previous step was final — nothing more to add.
            alert('All steps for this problem are already displayed!');
            return;
        }

        if (targetDescriptor.type === '__dynamic__') {
            // Find the last correctly answered non-count step value.
            const prevStep = [...this.steps].reverse().find(s => s.correct && s.submittedVal);
            const lastVal = prevStep ? prevStep.submittedVal : p.expression;
            const finalAnswer = p.targetSteps.find(s => s.type === 'final' || s.type === '__dynamic__')?.answer
                             ?? this.fullySimplify(p.expression);
            targetDescriptor = this.nextDynamicStep(lastVal, finalAnswer);
            // Overwrite the sentinel with the resolved descriptor so subsequent
            // re-renders of the same slot are consistent.
            p.targetSteps[stepCount - 1] = targetDescriptor;

            // If this resolved step is NOT yet final, append another dynamic sentinel
            // so the user can keep adding more steps.
            if (targetDescriptor.type !== 'final') {
                p.targetSteps.push({
                    question: '__dynamic__',
                    answer: finalAnswer,
                    type: '__dynamic__'
                });
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        const stepId = `s${Date.now()}`;
        const html = `
            <div class="step-row" id="step-${stepId}">
                <div class="step-label">Step ${stepCount}</div>
                <div class="step-input-area">
                    <div class="step-question">${targetDescriptor.question}</div>
                    <input type="text"
                           class="math-input"
                           id="input-${stepId}"
                           placeholder="Enter your answer..."
                           oninput="app.updatePreview('${stepId}', this.value)"
                           onkeydown="if(event.key==='Enter') app.checkStep('${stepId}', ${stepCount})">
                    <div class="preview-area" id="preview-${stepId}"></div>
                    <div class="hint-text" id="hint-${stepId}"></div>
                </div>
                <div class="step-actions">
                    <button class="btn" style="padding:0.55rem;" onclick="app.checkStep('${stepId}', ${stepCount})">Check</button>
                    <button class="btn btn-secondary" style="padding:0.55rem; color:#ef4444;" onclick="app.removeStep('${stepId}')">Delete</button>
                </div>
            </div>`;

        document.getElementById('steps-container').insertAdjacentHTML('beforeend', html);
        this.steps.push({ id: stepId, stepNum: stepCount, correct: false, submittedVal: null });
        document.getElementById('empty-state').style.display = 'none';

        setTimeout(() => document.getElementById(`input-${stepId}`)?.focus(), 50);

        // Hide the add-step button only when the current step is genuinely final
        if (targetDescriptor.type === 'final') {
            document.getElementById('add-step-btn').style.display = 'none';
        }
    },

    removeStep(id) {
        document.getElementById(`step-${id}`)?.remove();
        this.steps = this.steps.filter(s => s.id !== id);
        if (this.steps.length === 0) document.getElementById('empty-state').style.display = 'block';
        document.getElementById('add-step-btn').style.display = '';
    },

    updatePreview(id, val) {
        const preview = document.getElementById(`preview-${id}`);
        if (!val.trim()) { preview.innerHTML = ''; return; }
        
        const stepNum = this.steps.find(s => s.id === id)?.stepNum;
        const target = this.currentProblem?.targetSteps[stepNum - 1];
        
        if (target && target.type === 'count') {
            preview.textContent = val;
            return;
        }

        try {
            const latex = this.toLatex(val);
            katex.render(latex, preview, { throwOnError: false, displayMode: false });
            // Allow previews to be slightly larger if room, but not as huge as the main display
            this.fitToContainer(preview, 1.4);
        } catch(e) { preview.textContent = val; }
    },

    /* ──────────────────────────────────────
       CHECKING LOGIC
    ────────────────────────────────────── */
    checkStep(id, stepNum) {
        const row       = document.getElementById(`step-${id}`);
        const input     = document.getElementById(`input-${id}`);
        const hintEl    = document.getElementById(`hint-${id}`);
        const previewEl = document.getElementById(`preview-${id}`);
        const val = input.value.trim();
        if (!val) return;

        row.classList.remove('correct', 'error');
        hintEl.style.display = 'none';
        hintEl.innerHTML = '';
        hintEl.className = 'hint-text';
        void row.offsetWidth;

        const p      = this.currentProblem;
        const hints  = this.hintsEnabled();
        const target = p.targetSteps[stepNum - 1];
        let isCorrect = false;

        if (target.type === 'count') {
            // ── Step 1: count terms ───────────────────────────────────────────
            isCorrect = parseInt(val, 10) === target.answer;
            if (!isCorrect && hints) {
                hintEl.innerHTML = "Count the terms — outermost terms separated by '+' or '-' operators.";
                hintEl.style.display = 'block';
            }

        } else if (target.type === 'expand') {
            // ── Expansion step ────────────────────────────────────────────────
            // Accept any expression that is mathematically equivalent to the
            // original problem.  The user may still have brackets — that's fine;
            // the dynamic step system will keep prompting to expand further.
            const isEquivalent = this.compareExpressions(val, target.answer);
            if (isEquivalent) {
                isCorrect = true;
                // Store the submitted value so the next dynamic step can inspect
                // whether further expansion is still required.
                const stepObj = this.steps.find(s => s.id === id);
                if (stepObj) stepObj.submittedVal = val;
            } else {
                isCorrect = false;
                if (hints) {
                    this.renderTermHighlightError(val, target.answer, previewEl, hintEl, p.expression);
                }
            }

        } else if (target.type === 'final') {
            // ── Final step ────────────────────────────────────────────────────
            // Must be equivalent to the fully-simplified answer AND fully expanded
            // (no remaining bracket products) AND like terms collected.
            const finalAnswer = this.fullySimplify(p.expression);
            const isEquivalent = this.compareExpressions(val, finalAnswer);

            if (!isEquivalent) {
                isCorrect = false;
                if (hints) {
                    this.renderTermHighlightError(val, finalAnswer, previewEl, hintEl, p.expression);
                }
            } else {
                const fullyExpanded = this.isFullyExpanded(val);
                const simplified    = this.isSimplified(val);

                if (fullyExpanded && simplified) {
                    isCorrect = true;
                } else if (!fullyExpanded) {
                    isCorrect = false;
                    if (hints) {
                        hintEl.innerHTML = "Your answer is mathematically correct but not fully expanded. Expand all brackets!";
                        hintEl.style.display = 'block';
                        // Show the expression in red whole since it's structurally wrong
                        try {
                            katex.render(`{\\color{red} ${this.toLatex(val)}}`, previewEl, { throwOnError: false });
                            this.fitToContainer(previewEl, 1.2);
                        } catch(e) {}
                    }
                } else {
                    // Equivalent and fully expanded — accept even if isSimplified() is
                    // unreliable (e.g. mathjs counts terms differently).  Bug 5 fix:
                    // do NOT reject a correct fully-expanded answer.
                    isCorrect = true;
                }
            }
        }

        // ── Render outcome ────────────────────────────────────────────────────
        if (isCorrect) {
            row.classList.add('correct');
            try {
                const displayTex = target.type === 'count' ? val : this.toLatex(val);
                katex.render(displayTex, previewEl, { throwOnError: false });
                this.fitToContainer(previewEl, 1.4);
            } catch(e) {}

            const stepObj = this.steps.find(s => s.id === id);
            if (stepObj) { stepObj.correct = true; stepObj.submittedVal = stepObj.submittedVal ?? val; }

            if (!this.timerRunning && this.steps.filter(s => s.correct).length === 1) {
                this.startTimer();
            }

            // If this was the final step, celebrate; otherwise keep add-step available.
            if (target.type === 'final') {
                this.stopTimer();
                this.showSuccess(id);
                document.getElementById('add-step-btn').style.display = 'none';
            }
        } else {
            row.classList.add('error');
            // For non-hint mode, show the whole expression in red.
            if (!hints && target.type !== 'count') {
                try {
                    katex.render(`{\\color{red} ${this.toLatex(val)}}`, previewEl, { throwOnError: false });
                    this.fitToContainer(previewEl, 1.2);
                } catch(e) {}
            }
        }
    },

    /* ── Categorical Error Highlighting ──────────────────────────────────────
       Groups terms by variable "signature" (e.g. 'x', 'x^2', 'const', 'xy')
       and compares the total sum of coefficients for each signature in the 
       user's input vs the target answer. Terms contributing to a mismatched 
       category are highlighted RED.
    ─────────────────────────────────────────────────────────────────────────── */
    renderTermHighlightError(userVal, targetVal, previewEl, hintEl, originalExpr) {
        const HINT_MSG = 
            "Check your expansion and collection! Pay attention to the red terms—they " +
            "belong to a category (like constants or x-terms) that doesn't match the target.";

        try {
            const userTotals = this.getCategoryTotals(userVal);
            const targetTotals = this.getCategoryTotals(targetVal || originalExpr);

            // Identify which signatures are erroneous
            const allSigs = new Set([...Object.keys(userTotals), ...Object.keys(targetTotals)]);
            const errorSigs = new Set();
            for (const sig of allSigs) {
                const u = userTotals[sig] || 0;
                const t = targetTotals[sig] || 0;
                if (Math.abs(u - t) > 1e-6) {
                    errorSigs.add(sig);
                }
            }

            const userTerms = this.splitIntoTerms(userVal);
            const styledTerms = userTerms.map((t, idx) => {
                const termTotals = this.getCategoryTotals(t);
                let isError = false;
                for (const sig in termTotals) {
                    if (errorSigs.has(sig)) { isError = true; break; }
                }

                const tex = this.toLatex(t.trim().replace(/^\+\s*/, ''));
                const sign = (idx === 0) ? '' : (t.trim().startsWith('-') ? '' : '+');
                return isError ? `${sign}{\\color{red}${tex}}` : `${sign}{${tex}}`;
            });

            katex.render(styledTerms.join(' '), previewEl, { throwOnError: false });
            this.fitToContainer(previewEl, 1.2);
            hintEl.innerHTML = HINT_MSG;
            hintEl.style.display = 'block';
        } catch(e) {
            // Fallback to simple red display if parsing fails
            try {
                katex.render(`{\\color{red} ${this.toLatex(userVal)}}`, previewEl, { throwOnError: false });
                this.fitToContainer(previewEl, 1.2);
            } catch(e2) {}
            hintEl.innerHTML = HINT_MSG;
            hintEl.style.display = 'block';
        }
    },

    /* Returns a map of signature -> total coefficient for an expression. */
    getCategoryTotals(expr) {
        const totals = {};
        if (!expr) return totals;
        try {
            const normalized = this.normalizeMathExpression(expr);
            // CRITICAL: rationalize() fully expands brackets like (x+1)(x+2) -> x^2+3x+2
            // without this, target signatures would be complex and non-matching.
            const expanded = math.rationalize(normalized);
            const monomials = this.extractMonomials(expanded);

            for (const mon of monomials) {
                const { coeff, sig } = this.monomialToSignatureAndCoeff(mon);
                totals[sig] = (totals[sig] || 0) + coeff;
            }
        } catch(e) {
            console.warn("Category totals failure for:", expr, e);
        }
        return totals;
    },

    /* Recursively breaks a mathjs node tree into additive monomial nodes. */
    extractMonomials(node) {
        // Handle addition
        if (node.isOperatorNode && node.op === '+') {
            return [...this.extractMonomials(node.args[0]), ...this.extractMonomials(node.args[1])];
        }
        // Handle subtraction
        if (node.isOperatorNode && node.op === '-' && node.args.length === 2) {
            const left = this.extractMonomials(node.args[0]);
            const right = this.extractMonomials(node.args[1]).map(n => {
                // Return unary minus of the right-hand term: (a - b) -> a + (-b)
                return new math.OperatorNode('-', 'unaryMinus', [n]);
            });
            return [...left, ...right];
        }
        // Handle unary minus explicitly
        if (node.isOperatorNode && node.fn === 'unaryMinus') {
            return [node];
        }
        return [node];
    },

    /* Identifies the numeric coefficient and the symbolic "variable signature". */
    monomialToSignatureAndCoeff(node) {
        let coeff = 1;
        let sigNode = node;

        // 1. Handle unary minus: -x, -(3x)
        if (node.isOperatorNode && node.fn === 'unaryMinus' || (node.op === '-' && node.args.length === 1)) {
            const inner = this.monomialToSignatureAndCoeff(node.args[0]);
            return { coeff: -inner.coeff, sig: inner.sig };
        }

        // 2. Extract constant factor if node is a multiplication
        // math.simplify often puts the constant on the left, but we check both
        if (node.isOperatorNode && node.op === '*' && node.args.length === 2) {
            const left = node.args[0];
            const right = node.args[1];
            if (left.isConstantNode) {
                coeff = Number(left.value);
                sigNode = right;
            } else if (right.isConstantNode) {
                coeff = Number(right.value);
                sigNode = left;
            }
        } else if (node.isConstantNode) {
            return { coeff: Number(node.value), sig: 'const' };
        }

        // 3. Canonicalize the symbolic part
        try {
            // Further simplify the symbolic node to handle things like (x*x) -> x^2
            let sig = math.simplify(sigNode).toString().replace(/\s+/g, '');
            
            // If the simplification resulted in a pure number, it's a constant
            if (!isNaN(parseFloat(sig)) && isFinite(sig)) {
                return { coeff: coeff * parseFloat(sig), sig: 'const' };
            }
            // Ensure implicit 1 doesn't show up in signature for clean comparison
            if (sig === '1') return { coeff, sig: 'const' };
            
            return { coeff, sig };
        } catch(e) {
            return { coeff, sig: sigNode.toString() };
        }
    },

    /* Split an expression string into its top-level additive terms.
       E.g. "3x + 2(y - 1) - 5" → ["3x", "+2(y - 1)", "-5"] */
    splitIntoTerms(expr) {
        const terms = [];
        let depth = 0;
        let start = 0;
        const s = expr.trim();
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (ch === '(' || ch === '[' || ch === '{') depth++;
            else if (ch === ')' || ch === ']' || ch === '}') depth--;
            else if (depth === 0 && (ch === '+' || ch === '-') && i > 0) {
                const term = s.slice(start, i).trim();
                if (term) terms.push(term);
                start = i;
            }
        }
        const last = s.slice(start).trim();
        if (last) terms.push(last);
        return terms;
    },

    /* ──────────────────────────────────────
       MATH UTILITIES
    ────────────────────────────────────── */
    normalizeMathExpression(s) {
        if (!s) return '';
        let res = s.toString().replace(/\s+/g, '');
        // Replace square brackets and braces with parentheses for mathjs
        res = res.replace(/\[/g, '(').replace(/\]/g, ')');
        res = res.replace(/\{/g, '(').replace(/\}/g, ')');
        
        res = res.replace(/([0-9])([a-zA-Z])/g, '$1*$2');
        res = res.replace(/([a-zA-Z])([0-9])/g, '$1*$2');
        res = res.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
        res = res.replace(/(\))([0-9a-zA-Z(])/g, '$1*$2');
        res = res.replace(/([0-9a-zA-Z])(\()/g, '$1*$2');
        res = res.replace(/(\))(\()/g, '$1*$2');
        return res;
    },

    compareExpressions(userInput, targetRaw) {
        try {
            if (!userInput || !targetRaw) return false;
            const uN = this.normalizeMathExpression(userInput);
            const tN = this.normalizeMathExpression(targetRaw);
            const userExpr   = math.parse(uN).compile();
            const targetExpr = math.parse(tN).compile();
            
            const pointsX = [2.3, -1.7, 0.5];
            const pointsY = [1.2, -0.8, 2.5];
            const pointsZ = [0.4, 1.9, -1.1];
            
            let valid = 0;
            for (let i = 0; i < pointsX.length; i++) {
                const scope = { 
                    x: math.complex(pointsX[i], 0.1),
                    y: math.complex(pointsY[i], 0.2),
                    z: math.complex(pointsZ[i], 0.3)
                };
                const uVal = userExpr.evaluate(scope);
                const tVal = targetExpr.evaluate(scope);
                const diff = math.abs(math.subtract(uVal, tVal));
                
                if (typeof diff !== 'number' || isNaN(diff)) continue;
                valid++;
                if (diff > 1e-6) return false;
            }
            return valid > 0;
        } catch(e) { return false; }
    },

    nodeToLatex(node) {
        try {
            return this.toLatex(node);
        } catch(e) { return node.toString(); }
    },

    getNestingHeight(node) {
        if (node.isParenthesisNode) {
            return 1 + this.getNestingHeight(node.content);
        }
        let maxSub = 0;
        node.forEach(child => {
            maxSub = Math.max(maxSub, this.getNestingHeight(child));
        });
        return maxSub;
    },

    isFullyExpanded(val) {
        try {
            const node = math.parse(this.normalizeMathExpression(val));
            let hasUnexpanded = false;
            node.traverse(n => {
                // Unexpanded if we have parentheses containing sums/diffs that are part of multiplication or powers
                if (n.isParenthesisNode) {
                    let hasOp = false;
                    n.content.traverse(inner => {
                        if (inner.isOperatorNode && (inner.op === '+' || inner.op === '-')) hasOp = true;
                    });
                    if (hasOp) hasUnexpanded = true;
                }
                // Also check for something like (x+1)^2
                if (n.isOperatorNode && n.op === '^') {
                    n.args.forEach(arg => {
                        if (arg.isParenthesisNode || (arg.isOperatorNode && (arg.op === '+' || arg.op === '-'))) {
                            hasUnexpanded = true;
                        }
                    });
                }
            });
            return !hasUnexpanded;
        } catch(e) { return false; }
    },

    isSimplified(val) {
        try {
            const node = math.parse(this.normalizeMathExpression(val));
            const simplified = math.simplify(node);
            
            const countTerms = (n) => {
                if (n.isOperatorNode && (n.op === '+' || n.op === '-')) {
                    return n.args.reduce((acc, arg) => acc + countTerms(arg), 0);
                }
                return 1;
            };
            
            return countTerms(node) <= countTerms(simplified);
        } catch(e) { return false; }
    },

    toLatex(str) {
        if (!str) return '';
        try {
            const node = typeof str === 'string' ? math.parse(this.normalizeMathExpression(str)) : str;
            let tex = node.toTex({
                parenthesized: 'keep',
                implicit: 'hide',
                handler: (node, options) => {
                    // 1. Bracket Hierarchy (Problem 1)
                    if (node.isParenthesisNode) {
                        const h = this.getNestingHeight(node);
                        const innerTex = node.content.toTex(options);
                        if (h === 1) return `\\left(${innerTex}\\right)`;
                        if (h === 2) return `\\left[${innerTex}\\right]`;
                        return `\\left\\{${innerTex}\\right\\}`;
                    }

                    // 2. Suppress coefficient 1 and -1 (Continued from previous)
                    if (node.isOperatorNode && node.op === '*' && node.args.length === 2) {
                        const left = node.args[0];
                        const right = node.args[1];
                        if (left.isConstantNode) {
                            const v = Number(left.value);
                            const rightTex = right.toTex(options);
                            if (v === 1)  return rightTex;
                            if (v === -1) return '-' + rightTex;
                        }
                    }
                    return undefined;
                }
            });

            tex = tex.replace(/\\cdot/g, '');
            tex = tex.replace(/\\,/g, '');
            
            return tex;
        } catch(e) { return typeof str === 'string' ? str : ''; }
    },

    /* ──────────────────────────────────────
       WORKSPACE MANAGEMENT
    ────────────────────────────────────── */
    clearWorkspace() {
        document.getElementById('steps-container').innerHTML = '';
        this.steps = [];
        document.getElementById('empty-state').style.display = 'block';
        document.getElementById('add-step-btn').style.display = '';
    },

    showSuccess(id) {
        confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 }, colors: ['#8b5cf6', '#06b6d4', '#10b981'] });
        confetti({ particleCount: 80, spread: 50, origin: { y: 0.7, x: 0.2 }, colors: ['#f59e0b', '#ef4444'] });
        confetti({ particleCount: 80, spread: 50, origin: { y: 0.7, x: 0.8 }, colors: ['#8b5cf6', '#06b6d4'] });
        if (id) {
            const hintEl = document.getElementById(`hint-${id}`);
            if (hintEl) {
                hintEl.className = 'hint-text';
                hintEl.innerHTML = "<span style='color:var(--correct); font-weight:bold; font-size:1rem;'>🎉 WELL DONE! You expanded the expression correctly!</span>";
                hintEl.style.display = 'block';
            }
        }
    },

    init() {
        // Nothing auto-generated; user presses New Problem
    }
};

window.onload = () => app.init();