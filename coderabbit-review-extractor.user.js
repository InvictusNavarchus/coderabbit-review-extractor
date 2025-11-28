// ==UserScript==
// @name         CodeRabbit Review Extractor (Debug Version)
// @namespace    http://tampermonkey.net/
// @version      0.2.1
// @description  Extracts and summarizes CodeRabbit reviews from GitHub PRs into a beautiful, modern popup.
// @author       Your Name
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
            :root {
                --cr-bg: #1a1c2c;
                --cr-bg-light: #2a2d42;
                --cr-border: #4f537b;
                --cr-text: #e0e0e0;
                --cr-text-muted: #9fa4c4;
                --cr-red: #ff4d4d;
                --cr-red-hover: #ff6b6b;
                --cr-green: #50fa7b;
            }
            #cr-extractor-fab { position: fixed; bottom: 25px; right: 25px; width: 50px; height: 50px; background-color: var(--cr-red); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 9998; transition: transform 0.2s ease-in-out; }
            #cr-extractor-fab:hover { transform: scale(1.1); background-color: var(--cr-red-hover); }
            #cr-extractor-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; }
            #cr-extractor-overlay.visible { opacity: 1; visibility: visible; }
            #cr-extractor-popup { background-color: var(--cr-bg); color: var(--cr-text); border: 1px solid var(--cr-border); border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.5); transform: scale(0.95); transition: transform 0.3s; }
            #cr-extractor-overlay.visible #cr-extractor-popup { transform: scale(1); }
            .cr-popup-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--cr-border); }
            .cr-popup-header h2 { margin: 0; font-size: 1.1em; font-weight: 600; }
            .cr-popup-close { background: none; border: none; color: var(--cr-text-muted); font-size: 24px; cursor: pointer; padding: 0; line-height: 1; }
            .cr-popup-close:hover { color: var(--cr-red); }
            .cr-popup-body { padding: 20px; overflow-y: auto; }
            .cr-section-title { font-size: 1.1em; font-weight: 600; color: var(--cr-text); margin: 0 0 15px 0; padding-bottom: 5px; border-bottom: 1px solid var(--cr-border); }
            .cr-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px; }
            .cr-stat-item { background-color: var(--cr-bg-light); padding: 15px; border-radius: 8px; border: 1px solid var(--cr-border); }
            .cr-stat-item-title { font-size: 0.9em; color: var(--cr-text-muted); margin-bottom: 8px; }
            .cr-stat-item-value { font-size: 1.5em; font-weight: bold; color: var(--cr-text); }
            .cr-stat-category-list { list-style: none; padding: 0; margin: 0; font-size: 0.9em; }
            .cr-stat-category-list li { display: flex; justify-content: space-between; padding: 2px 0; }
            .cr-options-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px; }
            .cr-toggle { display: flex; align-items: center; cursor: pointer; }
            .cr-toggle-label { margin-left: 10px; }
            .cr-toggle input[type="checkbox"] { display: none; }
            .cr-toggle .switch { position: relative; display: inline-block; width: 40px; height: 22px; background-color: var(--cr-bg-light); border-radius: 22px; border: 1px solid var(--cr-border); transition: background-color 0.2s; }
            .cr-toggle .switch::before { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background-color: var(--cr-text-muted); top: 2px; left: 3px; transition: transform 0.2s, background-color 0.2s; }
            .cr-toggle input:checked + .switch { background-color: var(--cr-red); }
            .cr-toggle input:checked + .switch::before { background-color: white; transform: translateX(18px); }
            .cr-popup-footer { padding: 15px 20px; border-top: 1px solid var(--cr-border); text-align: right; }
            #cr-copy-btn { background-color: var(--cr-red); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background-color 0.2s; min-width: 120px; }
            #cr-copy-btn:hover { background-color: var(--cr-red-hover); }
            #cr-copy-btn.copied { background-color: var(--cr-green); color: var(--cr-bg); }
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

            // Find the AI prompt <details> by checking summary text content
            let promptText = null;
            const allDetails = bodyClone.querySelectorAll('details');
            let aiPromptDetails = null;

            for (const details of allDetails) {
                const summary = details.querySelector('summary');
                if (summary) {
                    const summaryText = summary.textContent.trim();
                    if (summaryText.includes('Prompt for AI Agents') || summaryText.includes('🤖 Prompt')) {
                        aiPromptDetails = details;
                        break;
                    }
                }
            }

            if (aiPromptDetails) {
                console.log(getPrefix(), 'Found AI prompt <details> element.');
                console.debug(getPrefix(), 'AI Prompt Details Element:', aiPromptDetails);
                promptText = aiPromptDetails.querySelector('pre code, code')?.textContent.trim() || null;
                console.log(getPrefix(), `Extracted prompt text: ${promptText ? `"${promptText.substring(0, 50)}..."` : 'null'}`);
                aiPromptDetails.remove();
            } else {
                console.log(getPrefix(), 'No AI prompt found in this thread.');
            }

            const fullText = bodyClone.textContent.trim();
            console.log(getPrefix(), `Extracted full text (trimmed): "${fullText.substring(0, 100)}..."`);

            const categoryRegex = /^(_|\*|\s)*(?:<g-emoji.+?>\s*)?([🛠️⚠️💡🧹📜].*?)(_|\*|\s)*\n/;
            const categoryMatch = fullText.match(categoryRegex);
            const category = categoryMatch ? categoryMatch[2].trim() : 'General';
            console.log(getPrefix(), `Category match found: ${!!categoryMatch}. Category: "${category}"`);

            const reviewData = {
                type: 'main',
                category: category,
                fullText: fullText,
                promptText: promptText,
                hasPrompt: !!promptText,
                element: thread,
            };
            reviews.push(reviewData);
            console.log(getPrefix(), `Successfully parsed a 'main' review.`);
            console.debug(getPrefix(), 'Parsed object:', reviewData);
        });
        console.log(getPrefix(), '--- Finished processing main review threads ---');

        // 2. Nitpick Reviews (in the main review summary)
        console.log(getPrefix(), 'Step 2: Searching for Nitpick summary section...');
        
        // Find nitpick summary by checking summary text content
        let nitpickSummary = null;
        const allSummaries = document.querySelectorAll('details summary');
        for (const summary of allSummaries) {
            const text = summary.textContent.trim();
            if (text.includes('Nitpick comments') || text.includes('🧹 Nitpick')) {
                nitpickSummary = summary;
                break;
            }
        }

        if (nitpickSummary) {
            console.log(getPrefix(), 'Found Nitpick summary element.');
            console.debug(getPrefix(), 'Nitpick Summary Element:', nitpickSummary);
            const nitpickDetailsContainer = nitpickSummary.closest('details');
            if (!nitpickDetailsContainer) {
                 console.log(getPrefix(), 'Could not find parent <details> for nitpick summary. Aborting nitpick search.');
                 return reviews;
            }
            console.log(getPrefix(), 'Found parent <details> container for nitpicks.');
            const nitpickFileBlocks = nitpickDetailsContainer.querySelectorAll(':scope > blockquote');
            console.log(getPrefix(), `Found ${nitpickFileBlocks.length} potential nitpick file blocks.`);

            nitpickFileBlocks.forEach((fileBlock, index) => {
                console.log(getPrefix(), `Processing nitpick block ${index + 1}/${nitpickFileBlocks.length}.`);
                console.debug(getPrefix(), 'Nitpick Block Element:', fileBlock);
                const filePathSummary = fileBlock.querySelector('details > summary');
                const commentBlock = fileBlock.querySelector('details > blockquote');

                if (filePathSummary && commentBlock) {
                    const filePath = filePathSummary.textContent.trim();
                    const fullText = commentBlock.textContent.trim();
                    console.log(getPrefix(), `Extracted nitpick for file: ${filePath}`);

                    if (fullText) {
                         const nitpickData = {
                            type: 'nitpick',
                            category: 'Nitpick',
                            fullText: `File: ${filePath}\n\n${fullText}`,
                            promptText: null,
                            hasPrompt: false,
                            element: fileBlock,
                        };
                        reviews.push(nitpickData);
                        console.log(getPrefix(), `Successfully parsed a 'nitpick' review.`);
                        console.debug(getPrefix(), 'Parsed object:', nitpickData);
                    } else {
                         console.log(getPrefix(), 'Nitpick comment block was empty. Skipping.');
                    }
                } else {
                    console.log(getPrefix(), `Could not find required summary/blockquote structure in nitpick block ${index + 1}. Skipping.`);
                }
            });
        } else {
            console.log(getPrefix(), 'No Nitpick summary section found on the page.');
        }

        console.log(getPrefix(), `--- PARSE END --- Found ${reviews.length} total review items.`);
        console.debug(getPrefix(), 'Final parsed data:', reviews);
        return reviews;
    }


    // --- UI & LOGIC ---
    function calculateStats(reviews) {
        const stats = { main: { total: 0, withPrompt: 0, categories: {} }, nitpicks: { total: 0 } };
        reviews.forEach(review => {
            if (review.type === 'main') {
                stats.main.total++;
                if (review.hasPrompt) stats.main.withPrompt++;
                const categoryName = review.category.replace(/<g-emoji.*?>/g, '').trim();
                stats.main.categories[categoryName] = (stats.main.categories[categoryName] || 0) + 1;
            } else if (review.type === 'nitpick') {
                stats.nitpicks.total++;
            }
        });
        return stats;
    }

    function generateCopyText(options, reviews) {
        let clipboardText = '';
        const selectedOptions = [];
        const mainSuggestions = reviews.filter(r => r.type === 'main');
        const nitpickComments = reviews.filter(r => r.type === 'nitpick');

        if (options.promptsOnly) selectedOptions.push("'Prompt for AI Agent' only");
        if (options.fullMain) selectedOptions.push("full reviews of all main suggestions");
        if (options.fullNitpicks) selectedOptions.push("full reviews of nitpick comments");
        if (options.mainNoPrompt) selectedOptions.push("full reviews of main suggestions that don't have 'Prompt for AI Agent'");

        if (selectedOptions.length > 0) {
            clipboardText += `# CodeRabbit PR Review Analysis\n\n`;
            clipboardText += `This document contains the following selections from the CodeRabbit review:\n- ${selectedOptions.join('\n- ')}\n\n---\n\n`;
        }

        if (options.promptsOnly) {
            const items = mainSuggestions.filter(r => r.hasPrompt);
            if (items.length > 0) {
                clipboardText += `## 🤖 Main Suggestion AI Prompts\n\n`;
                items.forEach((r, i) => {
                    clipboardText += `### Prompt ${i + 1}: ${r.category}\n`;
                    clipboardText += '```\n' + r.promptText + '\n```\n\n';
                });
                clipboardText += `---\n\n`;
            }
        }
        if (options.fullMain) {
            if (mainSuggestions.length > 0) {
                clipboardText += `## 🚀 Full Main Suggestions\n\n`;
                mainSuggestions.forEach((r, i) => {
                    clipboardText += `### Suggestion ${i + 1}: ${r.category}\n\n${r.fullText}\n\n`;
                });
                clipboardText += `---\n\n`;
            }
        }
        if (options.fullNitpicks) {
            if (nitpickComments.length > 0) {
                clipboardText += `## 🧹 Full Nitpick Comments\n\n`;
                nitpickComments.forEach((r, i) => {
                    clipboardText += `### Nitpick ${i + 1}\n\n${r.fullText}\n\n`;
                });
                clipboardText += `---\n\n`;
            }
        }
        if (options.mainNoPrompt) {
            const items = mainSuggestions.filter(r => !r.hasPrompt);
            if (items.length > 0) {
                clipboardText += `## 📝 Main Suggestions (Without AI Prompts)\n\n`;
                items.forEach((r, i) => {
                    clipboardText += `### Suggestion ${i + 1}: ${r.category}\n\n${r.fullText}\n\n`;
                });
                clipboardText += `---\n\n`;
            }
        }
        return clipboardText.trim() || "No content selected or found for the chosen options.";
    }

    function createPopup(stats, reviews) {
        if (document.getElementById('cr-extractor-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'cr-extractor-overlay';
        let categoryStatsHTML = '<ul class="cr-stat-category-list">';
        for(const [key, value] of Object.entries(stats.main.categories)) {
            categoryStatsHTML += `<li><span>${key}</span> <strong>${value}</strong></li>`;
        }
        categoryStatsHTML += '</ul>';
        overlay.innerHTML = `
            <div id="cr-extractor-popup">
                <div class="cr-popup-header"><h2>${SCRIPT_NAME}</h2><button class="cr-popup-close">&times;</button></div>
                <div class="cr-popup-body">
                    <h3 class="cr-section-title">📊 Statistics</h3>
                    <div class="cr-stats-grid">
                        <div class="cr-stat-item"><div class="cr-stat-item-title">Main Suggestions</div><div class="cr-stat-item-value">${stats.main.total}</div></div>
                        <div class="cr-stat-item"><div class="cr-stat-item-title">Nitpick Comments</div><div class="cr-stat-item-value">${stats.nitpicks.total}</div></div>
                        <div class="cr-stat-item"><div class="cr-stat-item-title">With AI Prompts</div><div class="cr-stat-item-value">${stats.main.withPrompt}</div></div>
                        <div class="cr-stat-item"><div class="cr-stat-item-title">Categories</div>${categoryStatsHTML}</div>
                    </div>
                    <h3 class="cr-section-title">📋 Copy Options</h3>
                    <div class="cr-options-list">
                        <label class="cr-toggle"><input type="checkbox" id="cr-opt-prompts" checked><span class="switch"></span><span class="cr-toggle-label">Copy 'Prompt for AI Agent' only</span></label>
                        <label class="cr-toggle"><input type="checkbox" id="cr-opt-full-main"><span class="switch"></span><span class="cr-toggle-label">Copy full reviews of all main suggestions</span></label>
                        <label class="cr-toggle"><input type="checkbox" id="cr-opt-nitpicks"><span class="switch"></span><span class="cr-toggle-label">Copy full reviews of nitpick comments</span></label>
                        <label class="cr-toggle"><input type="checkbox" id="cr-opt-main-no-prompt"><span class="switch"></span><span class="cr-toggle-label">Copy main suggestions that don't have 'Prompt for AI Agent'</span></label>
                    </div>
                </div>
                <div class="cr-popup-footer"><button id="cr-copy-btn">Copy to Clipboard</button></div>
            </div>`;
        document.body.appendChild(overlay);
        const closePopup = () => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 300); };
        overlay.querySelector('.cr-popup-close').addEventListener('click', closePopup);
        overlay.addEventListener('click', (e) => { if (e.target.id === 'cr-extractor-overlay') closePopup(); });
        const copyBtn = overlay.querySelector('#cr-copy-btn');
        copyBtn.addEventListener('click', () => {
            const options = {
                promptsOnly: document.getElementById('cr-opt-prompts').checked,
                fullMain: document.getElementById('cr-opt-full-main').checked,
                fullNitpicks: document.getElementById('cr-opt-nitpicks').checked,
                mainNoPrompt: document.getElementById('cr-opt-main-no-prompt').checked
            };
            const textToCopy = generateCopyText(options, reviews);
            GM_setClipboard(textToCopy);
            console.log(getPrefix(), 'Copied to clipboard:', textToCopy);
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; copyBtn.classList.remove('copied'); }, 2000);
        });
        setTimeout(() => overlay.classList.add('visible'), 10);
    }

    function init() {
        console.log(getPrefix(), 'Script loaded.');
        addStyles();
        if (!document.getElementById('discussion_bucket')) {
            console.log(getPrefix(), 'Not a PR page or discussion not loaded. Aborting.');
            return;
        }
        const fab = document.createElement('div');
        fab.id = 'cr-extractor-fab';
        fab.innerHTML = '🐰';
        fab.title = 'Extract CodeRabbit Reviews';
        document.body.appendChild(fab);
        fab.addEventListener('click', () => {
            const reviews = parseReviews();
            if (reviews.length === 0) {
                alert('No CodeRabbit reviews found on this page.');
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