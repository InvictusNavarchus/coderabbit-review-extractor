// ==UserScript==
// @name         CodeRabbit Review Extractor
// @namespace    http://tampermonkey.net/
// @version      0.3.0
// @description  Extracts and summarizes CodeRabbit reviews from GitHub PRs into a beautiful, modern popup.
// @author       Invictus Navarchus
// @match        https://github.com/*/*/pull/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @run-at       document-end
// @icon         https://coderabbit.ai/logo-192.png
// ==/UserScript==

(function() {
    'use strict';

    // --- UTILITIES ---
    const SCRIPT_NAME = 'CodeRabbit Extractor';
    const SCRIPT_EMOJI = '🐰';

    function getPrefix() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `[${SCRIPT_NAME} ${SCRIPT_EMOJI}] ${hh}:${mm}:${ss} -`;
    }

    // --- STYLES ---
    function addStyles() {
        GM_addStyle(`
            /* ========================================
               CSS Custom Properties (Design Tokens)
               ======================================== */
            
            /* Dark theme (default) */
            :root {
                /* Spacing scale (4px base) */
                --cr-space-1: 0.25rem;  /* 4px */
                --cr-space-2: 0.5rem;   /* 8px */
                --cr-space-3: 0.75rem;  /* 12px */
                --cr-space-4: 1rem;     /* 16px */
                --cr-space-5: 1.25rem;  /* 20px */
                --cr-space-6: 1.5rem;   /* 24px */
                
                /* Typography */
                --cr-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
                --cr-font-size-xs: 0.75rem;   /* 12px */
                --cr-font-size-sm: 0.875rem;  /* 14px */
                --cr-font-size-base: 1rem;    /* 16px */
                --cr-font-size-lg: 1.125rem;  /* 18px */
                --cr-font-size-xl: 1.5rem;    /* 24px */
                --cr-line-height: 1.5;
                --cr-line-height-tight: 1.25;
                
                /* Border radius */
                --cr-radius-sm: 0.375rem;  /* 6px */
                --cr-radius-md: 0.5rem;    /* 8px */
                --cr-radius-lg: 0.75rem;   /* 12px */
                --cr-radius-full: 9999px;
                
                /* Transitions */
                --cr-transition-fast: 150ms ease;
                --cr-transition-base: 200ms ease;
                --cr-transition-slow: 300ms ease;
                
                /* Shadows */
                --cr-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
                --cr-shadow-md: 0 4px 10px rgba(0, 0, 0, 0.3);
                --cr-shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.4);
                
                /* Dark theme colors (default) */
                --cr-bg: #1a1c2c;
                --cr-bg-light: #2a2d42;
                --cr-bg-hover: #353952;
                --cr-border: #4f537b;
                --cr-border-focus: #7c82b8;
                --cr-text: #e8e8ed;
                --cr-text-muted: #b4b9d4;  /* Improved contrast: ~5.2:1 */
                --cr-primary: #6366f1;     /* Indigo - more accessible than red for primary */
                --cr-primary-hover: #818cf8;
                --cr-primary-text: #ffffff;
                --cr-success: #22c55e;
                --cr-success-text: #052e16;
                --cr-danger: #ef4444;
                --cr-danger-hover: #f87171;
                --cr-focus-ring: rgba(99, 102, 241, 0.5);
            }
            
            /* Light theme support */
            @media (prefers-color-scheme: light) {
                :root {
                    --cr-bg: #ffffff;
                    --cr-bg-light: #f4f4f5;
                    --cr-bg-hover: #e4e4e7;
                    --cr-border: #d4d4d8;
                    --cr-border-focus: #a1a1aa;
                    --cr-text: #18181b;
                    --cr-text-muted: #52525b;  /* ~7:1 contrast on white */
                    --cr-primary: #4f46e5;
                    --cr-primary-hover: #6366f1;
                    --cr-primary-text: #ffffff;
                    --cr-success: #16a34a;
                    --cr-success-text: #ffffff;
                    --cr-danger: #dc2626;
                    --cr-danger-hover: #ef4444;
                    --cr-shadow-md: 0 4px 10px rgba(0, 0, 0, 0.1);
                    --cr-shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
                    --cr-focus-ring: rgba(79, 70, 229, 0.4);
                }
            }
            
            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                :root {
                    --cr-transition-fast: 0ms;
                    --cr-transition-base: 0ms;
                    --cr-transition-slow: 0ms;
                }
            }
            
            /* ========================================
               Base Component Styles
               ======================================== */
            
            /* Floating Action Button */
            #cr-extractor-fab {
                position: fixed;
                bottom: var(--cr-space-6);
                right: var(--cr-space-6);
                width: 3.5rem;
                height: 3.5rem;
                background-color: var(--cr-primary);
                color: var(--cr-primary-text);
                border: none;
                border-radius: var(--cr-radius-full);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: var(--cr-font-size-xl);
                cursor: pointer;
                box-shadow: var(--cr-shadow-md);
                z-index: 9998;
                transition: transform var(--cr-transition-base), 
                            background-color var(--cr-transition-base),
                            box-shadow var(--cr-transition-base);
                font-family: var(--cr-font-family);
                line-height: 1;
            }
            
            #cr-extractor-fab:hover {
                transform: scale(1.08);
                background-color: var(--cr-primary-hover);
                box-shadow: var(--cr-shadow-lg);
            }
            
            #cr-extractor-fab:focus {
                outline: none;
                box-shadow: var(--cr-shadow-md), 0 0 0 3px var(--cr-focus-ring);
            }
            
            #cr-extractor-fab:focus:not(:focus-visible) {
                box-shadow: var(--cr-shadow-md);
            }
            
            #cr-extractor-fab:focus-visible {
                box-shadow: var(--cr-shadow-md), 0 0 0 3px var(--cr-focus-ring);
            }
            
            #cr-extractor-fab:active {
                transform: scale(0.98);
            }
            
            /* Overlay */
            #cr-extractor-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: opacity var(--cr-transition-slow), visibility var(--cr-transition-slow);
                font-family: var(--cr-font-family);
            }
            
            #cr-extractor-overlay.visible {
                opacity: 1;
                visibility: visible;
            }
            
            /* Popup Container */
            #cr-extractor-popup {
                background-color: var(--cr-bg);
                color: var(--cr-text);
                border: 1px solid var(--cr-border);
                border-radius: var(--cr-radius-lg);
                width: 90%;
                max-width: 640px;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                box-shadow: var(--cr-shadow-lg);
                transform: scale(0.95) translateY(10px);
                transition: transform var(--cr-transition-slow);
                font-size: var(--cr-font-size-sm);
                line-height: var(--cr-line-height);
            }
            
            #cr-extractor-overlay.visible #cr-extractor-popup {
                transform: scale(1) translateY(0);
            }
            
            /* Header */
            .cr-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--cr-space-4) var(--cr-space-5);
                border-bottom: 1px solid var(--cr-border);
                flex-shrink: 0;
            }
            
            .cr-popup-header h2 {
                margin: 0;
                font-size: var(--cr-font-size-lg);
                font-weight: 600;
                line-height: var(--cr-line-height-tight);
                display: flex;
                align-items: center;
                gap: var(--cr-space-2);
            }
            
            .cr-popup-close {
                background: none;
                border: none;
                color: var(--cr-text-muted);
                font-size: 1.5rem;
                cursor: pointer;
                padding: var(--cr-space-1);
                line-height: 1;
                border-radius: var(--cr-radius-sm);
                transition: color var(--cr-transition-fast), background-color var(--cr-transition-fast);
                display: flex;
                align-items: center;
                justify-content: center;
                width: 2rem;
                height: 2rem;
            }
            
            .cr-popup-close:hover {
                color: var(--cr-danger);
                background-color: var(--cr-bg-hover);
            }
            
            .cr-popup-close:focus {
                outline: none;
                box-shadow: 0 0 0 2px var(--cr-focus-ring);
            }
            
            .cr-popup-close:focus:not(:focus-visible) {
                box-shadow: none;
            }
            
            .cr-popup-close:focus-visible {
                box-shadow: 0 0 0 2px var(--cr-focus-ring);
            }
            
            /* Body */
            .cr-popup-body {
                padding: var(--cr-space-5);
                overflow-y: auto;
                flex: 1;
            }
            
            /* Section Titles */
            .cr-section-title {
                font-size: var(--cr-font-size-base);
                font-weight: 600;
                color: var(--cr-text);
                margin: 0 0 var(--cr-space-4) 0;
                padding-bottom: var(--cr-space-2);
                border-bottom: 1px solid var(--cr-border);
                line-height: var(--cr-line-height-tight);
            }
            
            /* Stats Grid */
            .cr-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: var(--cr-space-3);
                margin-bottom: var(--cr-space-6);
            }
            
            .cr-stat-item {
                background-color: var(--cr-bg-light);
                padding: var(--cr-space-4);
                border-radius: var(--cr-radius-md);
                border: 1px solid var(--cr-border);
                transition: border-color var(--cr-transition-fast);
            }
            
            .cr-stat-item:hover {
                border-color: var(--cr-border-focus);
            }
            
            .cr-stat-item-title {
                font-size: var(--cr-font-size-xs);
                color: var(--cr-text-muted);
                margin-bottom: var(--cr-space-2);
                text-transform: uppercase;
                letter-spacing: 0.025em;
                font-weight: 500;
            }
            
            .cr-stat-item-value {
                font-size: var(--cr-font-size-xl);
                font-weight: 700;
                color: var(--cr-text);
                line-height: var(--cr-line-height-tight);
            }
            
            .cr-stat-category-list {
                list-style: none;
                padding: 0;
                margin: 0;
                font-size: var(--cr-font-size-xs);
            }
            
            .cr-stat-category-list li {
                display: flex;
                justify-content: space-between;
                padding: var(--cr-space-1) 0;
                gap: var(--cr-space-2);
            }
            
            .cr-stat-category-list li span {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            /* Options List */
            .cr-options-list {
                display: flex;
                flex-direction: column;
                gap: var(--cr-space-3);
                margin-bottom: var(--cr-space-6);
            }
            
            /* Accessible Toggle Switch */
            .cr-toggle {
                display: flex;
                align-items: center;
                cursor: pointer;
                padding: var(--cr-space-2);
                margin: calc(var(--cr-space-2) * -1);
                border-radius: var(--cr-radius-sm);
                transition: background-color var(--cr-transition-fast);
            }
            
            .cr-toggle:hover {
                background-color: var(--cr-bg-hover);
            }
            
            .cr-toggle-label {
                margin-left: var(--cr-space-3);
                user-select: none;
                flex: 1;
            }
            
            .cr-toggle-hint {
                font-size: var(--cr-font-size-xs);
                color: var(--cr-text-muted);
                margin-left: var(--cr-space-3);
                margin-top: var(--cr-space-1);
            }
            
            /* Visually hidden but accessible checkbox */
            .cr-toggle input[type="checkbox"] {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
            
            .cr-toggle .switch {
                position: relative;
                display: inline-block;
                width: 2.75rem;
                height: 1.5rem;
                background-color: var(--cr-bg-light);
                border-radius: var(--cr-radius-full);
                border: 2px solid var(--cr-border);
                transition: background-color var(--cr-transition-base), border-color var(--cr-transition-base);
                flex-shrink: 0;
            }
            
            .cr-toggle .switch::before {
                content: '';
                position: absolute;
                width: 1rem;
                height: 1rem;
                border-radius: var(--cr-radius-full);
                background-color: var(--cr-text-muted);
                top: 0.125rem;
                left: 0.125rem;
                transition: transform var(--cr-transition-base), background-color var(--cr-transition-base);
            }
            
            .cr-toggle input:checked + .switch {
                background-color: var(--cr-primary);
                border-color: var(--cr-primary);
            }
            
            .cr-toggle input:checked + .switch::before {
                background-color: var(--cr-primary-text);
                transform: translateX(1.25rem);
            }
            
            /* Focus styles for toggle */
            .cr-toggle input:focus + .switch {
                box-shadow: 0 0 0 3px var(--cr-focus-ring);
            }
            
            .cr-toggle input:focus:not(:focus-visible) + .switch {
                box-shadow: none;
            }
            
            .cr-toggle input:focus-visible + .switch {
                box-shadow: 0 0 0 3px var(--cr-focus-ring);
            }
            
            /* Footer */
            .cr-popup-footer {
                padding: var(--cr-space-4) var(--cr-space-5);
                border-top: 1px solid var(--cr-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: var(--cr-space-3);
                flex-shrink: 0;
                flex-wrap: wrap;
            }
            
            /* Preset Buttons */
            .cr-preset-group {
                display: flex;
                gap: var(--cr-space-2);
                flex-wrap: wrap;
            }
            
            .cr-preset-btn {
                background-color: var(--cr-bg-light);
                color: var(--cr-text-muted);
                border: 1px solid var(--cr-border);
                padding: var(--cr-space-2) var(--cr-space-3);
                border-radius: var(--cr-radius-sm);
                font-size: var(--cr-font-size-xs);
                font-weight: 500;
                cursor: pointer;
                transition: all var(--cr-transition-fast);
                font-family: var(--cr-font-family);
            }
            
            .cr-preset-btn:hover {
                background-color: var(--cr-bg-hover);
                color: var(--cr-text);
                border-color: var(--cr-border-focus);
            }
            
            .cr-preset-btn:focus {
                outline: none;
                box-shadow: 0 0 0 2px var(--cr-focus-ring);
            }
            
            .cr-preset-btn:focus:not(:focus-visible) {
                box-shadow: none;
            }
            
            .cr-preset-btn:focus-visible {
                box-shadow: 0 0 0 2px var(--cr-focus-ring);
            }
            
            /* Primary Button */
            #cr-copy-btn {
                background-color: var(--cr-primary);
                color: var(--cr-primary-text);
                border: none;
                padding: var(--cr-space-3) var(--cr-space-5);
                border-radius: var(--cr-radius-sm);
                font-weight: 600;
                cursor: pointer;
                transition: background-color var(--cr-transition-base), transform var(--cr-transition-fast);
                min-width: 10rem;
                font-size: var(--cr-font-size-sm);
                font-family: var(--cr-font-family);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: var(--cr-space-2);
            }
            
            #cr-copy-btn:hover {
                background-color: var(--cr-primary-hover);
            }
            
            #cr-copy-btn:focus {
                outline: none;
                box-shadow: 0 0 0 3px var(--cr-focus-ring);
            }
            
            #cr-copy-btn:focus:not(:focus-visible) {
                box-shadow: none;
            }
            
            #cr-copy-btn:focus-visible {
                box-shadow: 0 0 0 3px var(--cr-focus-ring);
            }
            
            #cr-copy-btn:active {
                transform: scale(0.98);
            }
            
            #cr-copy-btn.copied {
                background-color: var(--cr-success);
                color: var(--cr-success-text);
            }
            
            #cr-copy-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            /* Loading State */
            .cr-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--cr-space-6);
                gap: var(--cr-space-4);
            }
            
            .cr-spinner {
                width: 2.5rem;
                height: 2.5rem;
                border: 3px solid var(--cr-border);
                border-top-color: var(--cr-primary);
                border-radius: var(--cr-radius-full);
                animation: cr-spin 0.8s linear infinite;
            }
            
            @keyframes cr-spin {
                to { transform: rotate(360deg); }
            }
            
            @media (prefers-reduced-motion: reduce) {
                .cr-spinner {
                    animation: none;
                    border-top-color: var(--cr-border);
                    opacity: 0.5;
                }
            }
            
            .cr-loading-text {
                color: var(--cr-text-muted);
                font-size: var(--cr-font-size-sm);
            }
            
            /* Empty State */
            .cr-empty-state {
                text-align: center;
                padding: var(--cr-space-6);
            }
            
            .cr-empty-state-icon {
                font-size: 3rem;
                margin-bottom: var(--cr-space-4);
                opacity: 0.6;
            }
            
            .cr-empty-state-title {
                font-size: var(--cr-font-size-lg);
                font-weight: 600;
                color: var(--cr-text);
                margin: 0 0 var(--cr-space-2) 0;
            }
            
            .cr-empty-state-desc {
                color: var(--cr-text-muted);
                margin: 0;
                font-size: var(--cr-font-size-sm);
            }
            
            /* Help Text */
            .cr-help-text {
                color: var(--cr-text-muted);
                font-size: var(--cr-font-size-xs);
                margin-bottom: var(--cr-space-3);
            }
            
            /* Tooltip */
            .cr-tooltip-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
            }
            
            .cr-tooltip-icon {
                width: 1rem;
                height: 1rem;
                border-radius: var(--cr-radius-full);
                background-color: var(--cr-bg-light);
                border: 1px solid var(--cr-border);
                color: var(--cr-text-muted);
                font-size: var(--cr-font-size-xs);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-left: var(--cr-space-2);
                cursor: help;
                font-weight: 600;
                font-style: normal;
            }
            
            .cr-tooltip-icon:hover + .cr-tooltip,
            .cr-tooltip-icon:focus + .cr-tooltip {
                opacity: 1;
                visibility: visible;
                transform: translateX(-50%) translateY(0);
            }
            
            .cr-tooltip {
                position: absolute;
                bottom: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%) translateY(4px);
                background-color: var(--cr-bg);
                border: 1px solid var(--cr-border);
                border-radius: var(--cr-radius-sm);
                padding: var(--cr-space-2) var(--cr-space-3);
                font-size: var(--cr-font-size-xs);
                color: var(--cr-text);
                white-space: nowrap;
                max-width: 200px;
                white-space: normal;
                text-align: center;
                box-shadow: var(--cr-shadow-md);
                opacity: 0;
                visibility: hidden;
                transition: opacity var(--cr-transition-fast), transform var(--cr-transition-fast), visibility var(--cr-transition-fast);
                z-index: 10;
                pointer-events: none;
            }
            
            .cr-tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 6px solid transparent;
                border-top-color: var(--cr-border);
            }
            
            /* Screen reader only utility */
            .cr-sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `);
    }

    // --- DATA EXTRACTION ---
    function parseReviews() {
        console.log(getPrefix(), '--- PARSE START ---');
        const reviews = [];

        // 1. Main Actionable Reviews (in review threads)
        console.log(getPrefix(), 'Step 1: Searching for main review threads with selector: .review-thread-component');
        const reviewThreads = document.querySelectorAll('.review-thread-component');
        console.log(getPrefix(), `Found ${reviewThreads.length} potential review threads.`);

        reviewThreads.forEach((thread, index) => {
            console.log(getPrefix(), `Processing thread ${index + 1}/${reviewThreads.length}.`);
            console.debug(getPrefix(), 'Thread element:', thread);

            if (!thread.querySelector('a.author[href="/apps/coderabbitai"]')) {
                console.log(getPrefix(), `Thread ${index + 1} is NOT a CodeRabbit comment. Skipping.`);
                return;
            }
            console.log(getPrefix(), `Thread ${index + 1} is a CodeRabbit comment.`);

            const commentBody = thread.querySelector('.comment-body');
            if (!commentBody) {
                console.log(getPrefix(), `Thread ${index + 1} has no comment body. Skipping.`);
                return;
            }
            console.debug(getPrefix(), 'Found comment body:', commentBody);

            const bodyClone = commentBody.cloneNode(true);

            // Extract components separately
            const components = {
                category: null,
                reviewText: null,
                codeDiff: null,
                committableSuggestion: null,
                aiPrompt: null,
                tools: null,
            };

            // 1. Extract AI Prompt
            const allDetails = bodyClone.querySelectorAll('details');
            for (const details of allDetails) {
                const summary = details.querySelector('summary');
                if (summary) {
                    const summaryText = summary.textContent.trim();
                    if (summaryText.includes('Prompt for AI Agents') || summaryText.includes('🤖 Prompt')) {
                        components.aiPrompt = details.querySelector('pre code, code')?.textContent.trim() || null;
                        details.remove();
                        break;
                    }
                }
            }

            // 2. Extract Tools section
            const toolsDetails = bodyClone.querySelectorAll('details');
            for (const details of toolsDetails) {
                const summary = details.querySelector('summary');
                if (summary) {
                    const summaryText = summary.textContent.trim();
                    if (summaryText.includes('Tools') || summaryText.includes('🧰 Tools')) {
                        // Extract the inner details (nested tools info)
                        const toolsContent = [];
                        const innerDetails = details.querySelectorAll('details');
                        innerDetails.forEach(inner => {
                            const innerSummary = inner.querySelector('summary');
                            if (innerSummary) {
                                const toolName = innerSummary.textContent.trim();
                                const toolInfo = [];
                                inner.querySelectorAll('p').forEach(p => {
                                    toolInfo.push(p.textContent.trim());
                                });
                                if (toolInfo.length > 0) {
                                    toolsContent.push(`${toolName}:\n${toolInfo.join('\n')}`);
                                } else {
                                    toolsContent.push(toolName);
                                }
                            }
                        });
                        if (toolsContent.length > 0) {
                            components.tools = toolsContent.join('\n\n');
                        } else {
                            // Fallback: just get all text content
                            components.tools = details.textContent.replace(summaryText, '').trim();
                        }
                        details.remove();
                        break;
                    }
                }
            }

            // 3. Extract Committable Suggestion
            const remainingDetails = bodyClone.querySelectorAll('details');
            for (const details of remainingDetails) {
                const summary = details.querySelector('summary');
                if (summary) {
                    const summaryText = summary.textContent.trim();
                    if (summaryText.includes('Committable suggestion') || summaryText.includes('📝 Committable')) {
                        // Get the diff table content
                        const diffTable = details.querySelector('.js-suggested-changes-blob table');
                        if (diffTable) {
                            const lines = [];
                            diffTable.querySelectorAll('tr').forEach(row => {
                                const cell = row.querySelector('.blob-code-inner');
                                if (cell) {
                                    const marker = row.querySelector('.blob-code-marker-addition') ? '+' : 
                                                   row.querySelector('.blob-code-marker-deletion') ? '-' : ' ';
                                    lines.push(marker + cell.textContent);
                                }
                            });
                            components.committableSuggestion = lines.join('\n');
                        }
                        details.remove();
                        break;
                    }
                }
            }

            // 4. Extract Code Diff (inline diff in the review)
            const codeDiffBlock = bodyClone.querySelector('.highlight-source-diff');
            if (codeDiffBlock) {
                components.codeDiff = codeDiffBlock.textContent.trim();
                codeDiffBlock.closest('div.highlight')?.remove() || codeDiffBlock.remove();
            }

            // 5. Extract Category (first line with emoji)
            const fullText = bodyClone.textContent.trim();
            const categoryRegex = /^([🛠️⚠️💡🧹📜][^\n]*)/;
            const categoryMatch = fullText.match(categoryRegex);
            components.category = categoryMatch ? categoryMatch[1].trim() : 'General';

            // Determine if this is a nitpick based on category
            const isNitpick = components.category.toLowerCase().includes('nitpick') || 
                              components.category.includes('🧹');

            // 6. Extract Review Text (everything remaining after removing extracted parts)
            // Re-get the text after removals
            let reviewText = bodyClone.textContent.trim();
            // Remove the category line from the beginning
            if (categoryMatch) {
                reviewText = reviewText.substring(categoryMatch[0].length).trim();
            }
            components.reviewText = reviewText;

            const reviewData = {
                type: isNitpick ? 'nitpick' : 'main',
                components: components,
                hasPrompt: !!components.aiPrompt,
                hasCommittable: !!components.committableSuggestion,
                hasCodeDiff: !!components.codeDiff,
                hasTools: !!components.tools,
                element: thread,
            };
            reviews.push(reviewData);
            console.log(getPrefix(), `Successfully parsed a 'main' review.`);
            console.debug(getPrefix(), 'Parsed components:', components);
        });
        console.log(getPrefix(), '--- Finished processing main review threads ---');

        console.log(getPrefix(), `--- PARSE END --- Found ${reviews.length} total review items.`);
        console.debug(getPrefix(), 'Final parsed data:', reviews);
        return reviews;
    }


    // --- UI & LOGIC ---
    function calculateStats(reviews) {
        const stats = { 
            main: { total: 0, withPrompt: 0, withCommittable: 0, withCodeDiff: 0, withTools: 0, categories: {} }, 
            nitpicks: { total: 0 } 
        };
        reviews.forEach(review => {
            if (review.type === 'main') {
                stats.main.total++;
                if (review.hasPrompt) stats.main.withPrompt++;
                if (review.hasCommittable) stats.main.withCommittable++;
                if (review.hasCodeDiff) stats.main.withCodeDiff++;
                if (review.hasTools) stats.main.withTools++;
                const categoryName = review.components.category.replace(/<g-emoji.*?>/g, '').trim();
                stats.main.categories[categoryName] = (stats.main.categories[categoryName] || 0) + 1;
            } else if (review.type === 'nitpick') {
                stats.nitpicks.total++;
            }
        });
        return stats;
    }

    function generateCopyText(options, reviews) {
        let clipboardText = '';
        const mainSuggestions = reviews.filter(r => r.type === 'main');
        const nitpickComments = reviews.filter(r => r.type === 'nitpick');

        // Build header based on selected options
        const selectedComponents = [];
        if (options.includeCategory) selectedComponents.push("category/header");
        if (options.includeReviewText) selectedComponents.push("review text");
        if (options.includeCodeDiff) selectedComponents.push("code diff");
        if (options.includeCommittable) selectedComponents.push("committable suggestion");
        if (options.includeAiPrompt) selectedComponents.push("AI prompt");
        if (options.includeTools) selectedComponents.push("tools");

        if (selectedComponents.length > 0) {
            clipboardText += `# CodeRabbit PR Review Analysis\n\n`;
            clipboardText += `**Components included:** ${selectedComponents.join(', ')}\n`;
            clipboardText += `**Main suggestions:** ${mainSuggestions.length} | **Nitpicks:** ${options.includeNitpicks ? nitpickComments.length : 0}\n\n---\n\n`;
        }

        // Helper function to build a single review's text
        const buildReviewText = (review, index, type) => {
            let text = `### ${type} ${index + 1}`;
            
            if (options.includeCategory && review.components.category) {
                text += `: ${review.components.category}`;
            }
            text += '\n\n';

            if (options.includeReviewText && review.components.reviewText) {
                text += `${review.components.reviewText}\n\n`;
            }

            if (options.includeCodeDiff && review.components.codeDiff) {
                text += `**Code Diff:**\n\`\`\`diff\n${review.components.codeDiff}\n\`\`\`\n\n`;
            }

            if (options.includeCommittable && review.components.committableSuggestion) {
                text += `**Committable Suggestion:**\n\`\`\`diff\n${review.components.committableSuggestion}\n\`\`\`\n\n`;
            }

            if (options.includeAiPrompt && review.components.aiPrompt) {
                text += `**AI Prompt:**\n\`\`\`\n${review.components.aiPrompt}\n\`\`\`\n\n`;
            }

            if (options.includeTools && review.components.tools) {
                text += `**Tools Used:**\n${review.components.tools}\n\n`;
            }

            return text;
        };

        // Process main suggestions
        if (mainSuggestions.length > 0 && (options.includeCategory || options.includeReviewText || options.includeCodeDiff || options.includeCommittable || options.includeAiPrompt || options.includeTools)) {
            clipboardText += `## 🚀 Main Suggestions\n\n`;
            mainSuggestions.forEach((review, i) => {
                clipboardText += buildReviewText(review, i, 'Suggestion');
            });
            clipboardText += `---\n\n`;
        }

        // Process nitpicks
        if (options.includeNitpicks && nitpickComments.length > 0) {
            clipboardText += `## 🧹 Nitpick Comments\n\n`;
            nitpickComments.forEach((review, i) => {
                clipboardText += buildReviewText(review, i, 'Nitpick');
            });
            clipboardText += `---\n\n`;
        }

        return clipboardText.trim() || "No content selected or found for the chosen options.";
    }

    // --- FOCUS TRAP UTILITY ---
    function createFocusTrap(container) {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            'a[href]'
        ].join(', ');
        
        let firstFocusable = null;
        let lastFocusable = null;
        
        function updateFocusableElements() {
            const focusables = container.querySelectorAll(focusableSelectors);
            firstFocusable = focusables[0];
            lastFocusable = focusables[focusables.length - 1];
        }
        
        function handleKeyDown(e) {
            if (e.key !== 'Tab') return;
            
            updateFocusableElements();
            
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable?.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable?.focus();
                }
            }
        }
        
        function activate() {
            updateFocusableElements();
            container.addEventListener('keydown', handleKeyDown);
            // Focus first focusable element
            setTimeout(() => firstFocusable?.focus(), 50);
        }
        
        function deactivate() {
            container.removeEventListener('keydown', handleKeyDown);
        }
        
        return { activate, deactivate };
    }
    
    // --- TOOLTIP COMPONENT ---
    function createTooltipHTML(text) {
        return `
            <span class="cr-tooltip-wrapper">
                <span class="cr-tooltip-icon" tabindex="0" role="button" aria-label="More info">?</span>
                <span class="cr-tooltip" role="tooltip">${text}</span>
            </span>
        `;
    }
    
    function createPopup(stats, reviews) {
        if (document.getElementById('cr-extractor-overlay')) return;
        
        // Store previously focused element to restore later
        const previouslyFocused = document.activeElement;
        
        const overlay = document.createElement('div');
        overlay.id = 'cr-extractor-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'cr-popup-title');
        
        // Build category stats HTML
        let categoryStatsHTML = '';
        const categoryEntries = Object.entries(stats.main.categories);
        if (categoryEntries.length > 0) {
            categoryStatsHTML = '<ul class="cr-stat-category-list" role="list">';
            for (const [key, value] of categoryEntries) {
                categoryStatsHTML += `<li><span>${escapeHtml(key)}</span> <strong>${value}</strong></li>`;
            }
            categoryStatsHTML += '</ul>';
        } else {
            categoryStatsHTML = '<span style="color: var(--cr-text-muted)">None found</span>';
        }
        
        overlay.innerHTML = `
            <div id="cr-extractor-popup">
                <div class="cr-popup-header">
                    <h2 id="cr-popup-title">
                        <span aria-hidden="true">${SCRIPT_EMOJI}</span>
                        ${SCRIPT_NAME}
                    </h2>
                    <button 
                        class="cr-popup-close" 
                        aria-label="Close dialog"
                        type="button"
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div class="cr-popup-body">
                    <section aria-labelledby="cr-stats-heading">
                        <h3 id="cr-stats-heading" class="cr-section-title">
                            <span aria-hidden="true">📊</span> Statistics
                        </h3>
                        <div class="cr-stats-grid" role="group" aria-label="Review statistics">
                            <div class="cr-stat-item">
                                <div class="cr-stat-item-title">Main Suggestions</div>
                                <div class="cr-stat-item-value" aria-label="${stats.main.total} main suggestions">${stats.main.total}</div>
                            </div>
                            <div class="cr-stat-item">
                                <div class="cr-stat-item-title">Nitpick Comments</div>
                                <div class="cr-stat-item-value" aria-label="${stats.nitpicks.total} nitpick comments">${stats.nitpicks.total}</div>
                            </div>
                            <div class="cr-stat-item">
                                <div class="cr-stat-item-title">With AI Prompts</div>
                                <div class="cr-stat-item-value" aria-label="${stats.main.withPrompt} with AI prompts">${stats.main.withPrompt}</div>
                            </div>
                            <div class="cr-stat-item">
                                <div class="cr-stat-item-title">With Tools</div>
                                <div class="cr-stat-item-value" aria-label="${stats.main.withTools} with tools">${stats.main.withTools}</div>
                            </div>
                            <div class="cr-stat-item">
                                <div class="cr-stat-item-title">Categories</div>
                                ${categoryStatsHTML}
                            </div>
                        </div>
                    </section>
                    
                    <section aria-labelledby="cr-components-heading">
                        <h3 id="cr-components-heading" class="cr-section-title">
                            <span aria-hidden="true">📋</span> Copy Components
                        </h3>
                        <p class="cr-help-text">Select which parts of each review to include in the copied output:</p>
                        <div class="cr-options-list" role="group" aria-label="Component selection options">
                            <label class="cr-toggle">
                                <input type="checkbox" id="cr-opt-category" checked>
                                <span class="switch" aria-hidden="true"></span>
                                <span class="cr-toggle-label">Category / Header</span>
                            </label>
                            <label class="cr-toggle">
                                <input type="checkbox" id="cr-opt-review-text" checked>
                                <span class="switch" aria-hidden="true"></span>
                                <span class="cr-toggle-label">Review Text</span>
                            </label>
                            <label class="cr-toggle">
                                <input type="checkbox" id="cr-opt-code-diff" checked>
                                <span class="switch" aria-hidden="true"></span>
                                <span class="cr-toggle-label">Code Diff</span>
                                ${createTooltipHTML('Inline code differences shown in the review')}
                            </label>
                            <label class="cr-toggle">
                                <input type="checkbox" id="cr-opt-committable">
                                <span class="switch" aria-hidden="true"></span>
                                <span class="cr-toggle-label">Committable Suggestion</span>
                                ${createTooltipHTML('Ready-to-apply code changes that can be committed directly')}
                            </label>
                            <label class="cr-toggle">
                                <input type="checkbox" id="cr-opt-ai-prompt" checked>
                                <span class="switch" aria-hidden="true"></span>
                                <span class="cr-toggle-label">AI Prompt</span>
                                ${createTooltipHTML('Prompts designed for AI agents to apply fixes automatically')}
                            </label>
                            <label class="cr-toggle">
                                <input type="checkbox" id="cr-opt-tools">
                                <span class="switch" aria-hidden="true"></span>
                                <span class="cr-toggle-label">Tools Used</span>
                                ${createTooltipHTML('Analysis tools used by CodeRabbit (linters, type checkers, etc.)')}
                            </label>
                        </div>
                    </section>
                    
                    <section aria-labelledby="cr-sources-heading">
                        <h3 id="cr-sources-heading" class="cr-section-title">
                            <span aria-hidden="true">📂</span> Include Sources
                        </h3>
                        <div class="cr-options-list" role="group" aria-label="Source selection options">
                            <label class="cr-toggle">
                                <input type="checkbox" id="cr-opt-nitpicks">
                                <span class="switch" aria-hidden="true"></span>
                                <span class="cr-toggle-label">Include Nitpick Comments</span>
                                ${createTooltipHTML('Minor style or formatting suggestions (marked with 🧹)')}
                            </label>
                        </div>
                    </section>
                </div>
                <div class="cr-popup-footer">
                    <div class="cr-preset-group" role="group" aria-label="Quick presets">
                        <button type="button" class="cr-preset-btn" data-preset="all">Select All</button>
                        <button type="button" class="cr-preset-btn" data-preset="none">Select None</button>
                        <button type="button" class="cr-preset-btn" data-preset="essential">Essential</button>
                    </div>
                    <button id="cr-copy-btn" type="button">
                        <span class="cr-copy-btn-text">Copy to Clipboard</span>
                    </button>
                </div>
            </div>`;
        
        document.body.appendChild(overlay);
        
        // Setup focus trap
        const popup = overlay.querySelector('#cr-extractor-popup');
        const focusTrap = createFocusTrap(popup);
        
        // Close popup handler
        const closePopup = () => {
            focusTrap.deactivate();
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.remove();
                // Restore focus to previously focused element
                previouslyFocused?.focus();
            }, 300);
        };
        
        // Close button click
        overlay.querySelector('.cr-popup-close').addEventListener('click', closePopup);
        
        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target.id === 'cr-extractor-overlay') closePopup();
        });
        
        // Escape key to close
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Preset buttons
        const presetButtons = overlay.querySelectorAll('.cr-preset-btn');
        const checkboxes = {
            category: overlay.querySelector('#cr-opt-category'),
            reviewText: overlay.querySelector('#cr-opt-review-text'),
            codeDiff: overlay.querySelector('#cr-opt-code-diff'),
            committable: overlay.querySelector('#cr-opt-committable'),
            aiPrompt: overlay.querySelector('#cr-opt-ai-prompt'),
            tools: overlay.querySelector('#cr-opt-tools'),
            nitpicks: overlay.querySelector('#cr-opt-nitpicks'),
        };
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                
                switch (preset) {
                    case 'all':
                        Object.values(checkboxes).forEach(cb => cb.checked = true);
                        break;
                    case 'none':
                        Object.values(checkboxes).forEach(cb => cb.checked = false);
                        break;
                    case 'essential':
                        // Essential: category, review text, AI prompt
                        checkboxes.category.checked = true;
                        checkboxes.reviewText.checked = true;
                        checkboxes.codeDiff.checked = false;
                        checkboxes.committable.checked = false;
                        checkboxes.aiPrompt.checked = true;
                        checkboxes.tools.checked = false;
                        checkboxes.nitpicks.checked = false;
                        break;
                }
            });
        });
        
        // Copy button
        const copyBtn = overlay.querySelector('#cr-copy-btn');
        const copyBtnText = copyBtn.querySelector('.cr-copy-btn-text');
        
        copyBtn.addEventListener('click', () => {
            const options = {
                includeCategory: checkboxes.category.checked,
                includeReviewText: checkboxes.reviewText.checked,
                includeCodeDiff: checkboxes.codeDiff.checked,
                includeCommittable: checkboxes.committable.checked,
                includeAiPrompt: checkboxes.aiPrompt.checked,
                includeTools: checkboxes.tools.checked,
                includeNitpicks: checkboxes.nitpicks.checked,
            };
            
            const textToCopy = generateCopyText(options, reviews);
            GM_setClipboard(textToCopy);
            console.log(getPrefix(), 'Copied to clipboard:', textToCopy);
            
            // Visual feedback
            copyBtnText.textContent = '✓ Copied!';
            copyBtn.classList.add('copied');
            copyBtn.setAttribute('aria-label', 'Copied to clipboard');
            
            setTimeout(() => {
                copyBtnText.textContent = 'Copy to Clipboard';
                copyBtn.classList.remove('copied');
                copyBtn.removeAttribute('aria-label');
            }, 2000);
        });
        
        // Activate focus trap and show popup
        setTimeout(() => {
            overlay.classList.add('visible');
            focusTrap.activate();
        }, 10);
    }
    
    // --- EMPTY STATE POPUP ---
    function showEmptyState() {
        if (document.getElementById('cr-extractor-overlay')) return;
        
        const previouslyFocused = document.activeElement;
        
        const overlay = document.createElement('div');
        overlay.id = 'cr-extractor-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'cr-empty-title');
        
        overlay.innerHTML = `
            <div id="cr-extractor-popup">
                <div class="cr-popup-header">
                    <h2 id="cr-popup-title">
                        <span aria-hidden="true">${SCRIPT_EMOJI}</span>
                        ${SCRIPT_NAME}
                    </h2>
                    <button 
                        class="cr-popup-close" 
                        aria-label="Close dialog"
                        type="button"
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div class="cr-popup-body">
                    <div class="cr-empty-state">
                        <div class="cr-empty-state-icon" aria-hidden="true">🔍</div>
                        <h3 id="cr-empty-title" class="cr-empty-state-title">No Reviews Found</h3>
                        <p class="cr-empty-state-desc">
                            No CodeRabbit reviews were found on this pull request.
                            Make sure you're viewing the "Files changed" tab or that CodeRabbit has reviewed this PR.
                        </p>
                    </div>
                </div>
                <div class="cr-popup-footer" style="justify-content: flex-end;">
                    <button id="cr-close-empty-btn" type="button" class="cr-preset-btn">Close</button>
                </div>
            </div>`;
        
        document.body.appendChild(overlay);
        
        const popup = overlay.querySelector('#cr-extractor-popup');
        const focusTrap = createFocusTrap(popup);
        
        const closePopup = () => {
            focusTrap.deactivate();
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.remove();
                previouslyFocused?.focus();
            }, 300);
        };
        
        overlay.querySelector('.cr-popup-close').addEventListener('click', closePopup);
        overlay.querySelector('#cr-close-empty-btn').addEventListener('click', closePopup);
        overlay.addEventListener('click', (e) => {
            if (e.target.id === 'cr-extractor-overlay') closePopup();
        });
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        setTimeout(() => {
            overlay.classList.add('visible');
            focusTrap.activate();
        }, 10);
    }
    
    // --- HTML ESCAPE UTILITY ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function init() {
        console.log(getPrefix(), 'Script loaded.');
        addStyles();
        if (!document.getElementById('discussion_bucket')) {
            console.log(getPrefix(), 'Not a PR page or discussion not loaded. Aborting.');
            return;
        }
        
        // Create accessible FAB
        const fab = document.createElement('button');
        fab.id = 'cr-extractor-fab';
        fab.type = 'button';
        fab.setAttribute('aria-label', 'Extract CodeRabbit Reviews');
        fab.setAttribute('title', 'Extract CodeRabbit Reviews');
        fab.innerHTML = '<span aria-hidden="true">🐰</span>';
        document.body.appendChild(fab);
        
        fab.addEventListener('click', () => {
            const reviews = parseReviews();
            if (reviews.length === 0) {
                showEmptyState();
                return;
            }
            const stats = calculateStats(reviews);
            createPopup(stats, reviews);
        });
    }

    // --- MAIN EXECUTION ---
    const observer = new MutationObserver((mutations, obs) => {
        const fabExists = document.getElementById('cr-extractor-fab');
        const isPRPage = window.location.pathname.includes('/pull/');
        const discussionLoaded = document.getElementById('discussion_bucket');

        if (isPRPage && discussionLoaded && !fabExists) {
            init();
        } else if (!isPRPage && fabExists) {
            fabExists.remove();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();