// @ts-check
'use strict';

void function() {

/**
 * @typedef {'en' | 'zh-hant' | 'zh-hans'} Lang
 */

/**
 * @typedef {'all' | Lang} LangOrAll
 */

/**
 * @typedef {Record<string, string>} SelectorMap
 */

/**
 * @typedef {Object} L10nEntry
 * @property {SelectorMap} selector - CSS selectors mapped to localized text
 * @property {string} fig - Localized prefix for figure captions
 * @property {string} collapseSidebar
 * @property {string} expandSidebar
 * @property {string} jumpToToc
 * @property {string} [summary] - Localized summary text for the document details section
 * @property {Record<string, string>} dt - Localized definition terms (dt elements)
 * @property {Record<string, string>} dd - Localized definition descriptions (dd elements, may contain HTML)
 */

/**
 * @typedef {Record<Lang, L10nEntry>} L10nMap
 */

/**
 * @typedef {Window & typeof globalThis & { switchLang: (lang: LangOrAll) => void }} AppWindow
 */



// ------------------------------------------------------------
//  CONSTANTS
// ------------------------------------------------------------

/** @type {readonly Lang[]} */
const LANG_LIST = ['en', 'zh-hant', 'zh-hans']

// Localisation dictionary
/** @type {L10nMap} */
const L10N = {
    'en': {
        // CSS selectors for elements that need text replacement
        selector: {
            'head > title': 'Requirements for Chinese Text Layout',
            '#abstract > h2': 'Abstract',
            '#toc > ol > li:nth-child(1) > a': 'Abstract',
            '#sotd > h2': 'Status of This Document',
            '#toc > ol > li:nth-child(2) > a': 'Status of This Document',
            '#table-of-contents': 'Table of Contents',
            '.note-title': 'Note',
            },

        // Prefix for figure captions (e.g., "Fig. 1", "Fig. 2")
        fig: 'Fig. ',
        collapseSidebar: 'Collapse Sidebar',
        expandSidebar: 'Pop Out Sidebar',
        jumpToToc: 'Jump to Table of Contents',
        dt: {},
        dd: {
            'Bug tracker:': '<a href="https://github.com/w3c/clreq/issues">file a bug</a> (<a href="https://github.com/w3c/clreq/issues">open bugs</a>)',
            },
        },


    'zh-hant': {
        // CSS selectors for elements that need text replacement
        selector: {
            'head > title': '中文排版需求',
            '#abstract > h2': '摘要',
            '#toc > ol > li:nth-child(1) > a': '摘要',
            '#sotd > h2': '關於本文檔',
            '#toc > ol > li:nth-child(2) > a': '關於本文檔',
            '#table-of-contents': '內容大綱',
            '.note-title': '注',
            },

        // Prefix for figure captions (e.g., "Fig. 1", "Fig. 2")
        fig: '圖',
        collapseSidebar: '收起側邊欄',
        expandSidebar: '彈出側邊欄',
        jumpToToc: '跳轉至內容大綱',
        summary: '關於此文檔',
        dt: {
            'This version:': '本版本：',
            'History:': '歷史：',
            'Previous version:': '上一版：',
            'Latest published version:': '最新發佈草稿：',
            'Latest editor\'s draft:': '最新編輯草稿：',
            'Editors:': '編輯：',
            'Former editors:': '原編輯：',
            'Participate:': '協助參與：',
            'Feedback:': '反饋：',
            'Contributors:': '貢獻者：',
            },
        dd: {
            'Bug tracker:': '<a href="https://github.com/w3c/clreq/issues">反饋錯誤</a>（<a href="https://github.com/w3c/clreq/issues">修正中的錯誤</a>）',
            }
        },


      'zh-hans': {
        // CSS selectors for elements that need text replacement
        selector: {
            'head > title': '中文排版需求',
            '#abstract > h2': '摘要',
            '#toc > ol > li:nth-child(1) > a': '摘要',
            '#sotd > h2': '关于本文档',
            '#toc > ol > li:nth-child(2) > a': '关于本文档',
            '#table-of-contents': '内容大纲',
            '.note-title': '注',
            },

        // Prefix for figure captions (e.g., "Fig. 1", "Fig. 2")
        fig: '图',
        collapseSidebar: '收起侧边栏',
        expandSidebar: '弹出侧边栏',
        jumpToToc: '跳转至内容大纲',
        summary: '关于此文档',
        dt: {
            'This version:': '本版本：',
            'History:': '历史：',
            'Previous version:': '上一版：',
            'Latest published version:': '最新发布草稿：',
            'Latest editor\'s draft:': '最新编辑草稿：',
            'Editors:': '编辑：',
            'Former editors:': '原编辑：',
            'Participate:': '协助参与：',
            'Feedback:': '反馈：',
            'Contributors:': '贡献者：',
            },
        dd: {
            'Bug tracker:': '<a href="https://github.com/w3c/clreq/issues">反馈错误</a>（<a href="https://github.com/w3c/clreq/issues">修正中的错误</a>）',
            }
        },
    }


// Root <html> element
/** @type {HTMLElement} */
const rootNode = document.documentElement

// Track elements hidden during language switching
/** @type {HTMLElement[]} */
let hiddenNodeList = []




// ------------------------------------------------------------
//  UTILITY HELPERS
// ------------------------------------------------------------

// Convert NodeList → Array
/**
 * @template T
 * @param {ArrayLike<T>} obj
 * @returns {T[]}
 */
function arrayify(obj) {
    return Array.from(obj)
    }

/**
 * Convenience function for querySelectorAll that returns a proper Array.
 * @param {string} selector - CSS selector string
 * @returns {HTMLElement[]} Array of matching DOM elements
 */


// Query selector returning an Array of nodes
function queryNodeList(selector) {
    return arrayify(document.querySelectorAll(selector))
    }

// Convert "all" → "en" so the rest of the code can treat it normally
function normalizeLang(lang) {
    return lang === "all" ? "en" : lang
    }




// ------------------------------------------------------------
//  LANGUAGE SWITCHING
// ------------------------------------------------------------

// Update <html> attributes and CSS classes based on selected language
/**
 * @param {LangOrAll} lang
 */
function toggleRootClass(lang) {
    const norm = normalizeLang(lang)
    rootNode.lang = norm

    if (lang === "all") {
        rootNode.classList.add("is-multilingual")
        rootNode.classList.remove("isnt-multilingual")
        }
    else {
        rootNode.classList.remove("is-multilingual")
        rootNode.classList.add("isnt-multilingual")
        }
   }


// Show only the elements belonging to the selected language
/**
 * @param {LangOrAll} lang
 */
function showAndHideLang(lang) {
    // Unhide everything previously hidden
    hiddenNodeList.forEach(elmtNode => elmtNode.hidden = false)

    if (lang === "all") return

    // Build a new list of elements to hide
    hiddenNodeList = LANG_LIST
        .filter(it => it !== lang)
        .flatMap(it => queryNodeList(`[its-locale-filter-list="${it}"]`))

    // Hide them
    hiddenNodeList.forEach(elmtNode => elmtNode.hidden = true)
    }





// ------------------------------------------------------------
//  TEXT REPLACEMENT / LOCALISATION
// ------------------------------------------------------------

// Replace fixed boilerplate text (titles, headings, dt/dd, figure labels)
/**
 * @param {LangOrAll} lang
 */
function replaceBoilerplateText(lang) {

    const l10n = L10N[normalizeLang(lang)]

    // Replace text for fixed selectors
    for (const [selector, text] of Object.entries(l10n.selector)) {
        queryNodeList(selector).forEach(elmtNode => elmtNode.textContent = text)
        }

    // Replace figure caption prefixes
    queryNodeList("figcaption > .self-link, .fig-ref").forEach(elmtNode => {
        if (elmtNode.firstChild) elmtNode.firstChild.nodeValue = l10n.fig
        })

    // Replace <summary> text in document header
    queryNodeList("body > div.head > details > summary").forEach(summaryNode => {

        const original = summaryNode.dataset.originalText || summaryNode.textContent.trim()
        const replacement = l10n.summary || original

        summaryNode.textContent = replacement
        summaryNode.dataset.originalText = original
        })

    // Replace <dt> and <dd> entries
    queryNodeList("body > div.head > details > dl > dt").forEach(dtNode => {

        const original = dtNode.dataset.originalText || dtNode.textContent.trim()
        const replacement = l10n.dt[original] || original

        dtNode.textContent = replacement
        dtNode.dataset.originalText = original

        // Special case: Bug tracker <dd> contains HTML
        if (original === "Bug tracker:") {
            dtNode.nextElementSibling.innerHTML = l10n.dd["Bug tracker:"]
            }
        })

    translateFixupStrings(lang)
    }






// ------------------------------------------------------------
//  SIDEBAR FIXUP TEXT (dynamic)
// ------------------------------------------------------------

/** @type {MutationObserver | null} */
let sidebarObserver = null


// Update sidebar UI text (collapse/expand/jump)
/**
 * @param {LangOrAll} lang
 */
function translateFixupStrings(lang) {

    const l10n = L10N[normalizeLang(lang)]

    const fixupIds = {
        "toc-collapse-text": "collapseSidebar",
        "toc-expand-text": "expandSidebar",
        "toc-jump-text": "jumpToToc"
        }

    for (const [id, key] of Object.entries(fixupIds)) {
        const elmtNode = document.getElementById(id)
        if (elmtNode && l10n[key] && elmtNode.textContent !== l10n[key]) {
            elmtNode.textContent = l10n[key]
            }
        }

    // Install MutationObserver once
    if (!sidebarObserver) {

        const toggleNode = document.getElementById("toc-toggle")
        if (!toggleNode) return

        sidebarObserver = new MutationObserver(() => {
            const current = rootNode.lang || "en"
            if (current !== "en") translateFixupStrings(current)
            })

        sidebarObserver.observe(toggleNode, { childList:true, subtree:true })
        }
    }






// ------------------------------------------------------------
//  LANGUAGE BUTTON HIGHLIGHTING
// ------------------------------------------------------------

// Highlight the selected language button
function updateSelectedLanguageButton(lang) {

    const btnNodeList = document.querySelectorAll("#langSwitch > button")
    const btnArray = Array.from(btnNodeList)

    btnArray.forEach(btnNode => {

        const onclickValue = btnNode.getAttribute("onclick") || ""
        const match = onclickValue.match(/switchLang\('([^']+)'\)/)
        const btnLang = match ? match[1] : null

        if (btnLang === lang) btnNode.classList.add("selectedLanguage")
        else btnNode.classList.remove("selectedLanguage")
        })
    }





// ------------------------------------------------------------
//  PUBLIC API
// ------------------------------------------------------------
/**
 * Expose to global for now since respec will re-parse the entire document
 * and event bound will be lost.
 * @param {LangOrAll} lang
 */
/** @type {AppWindow} */ (/** @type {unknown} */ 
(window)).switchLang = function(lang) {
    toggleRootClass(lang)
    showAndHideLang(lang)
    replaceBoilerplateText(lang)
    updateSelectedLanguageButton(lang)
    }






// ------------------------------------------------------------
//  INITIALISATION HELPERS
// ------------------------------------------------------------

// Add self-link anchors for all p and li elements with id attributes
function addSelfLinks() {
    queryNodeList("li[id]").forEach(elmtNode => {

        const id = elmtNode.id
        if (!id) return

        const linkNode = document.createElement("a")
        linkNode.className = "self-link"
        linkNode.href = `#${id}`

        elmtNode.insertBefore(linkNode, elmtNode.firstChild)
        })
    }


/**
 * Add `lang` attribute wherever there is a its-locale-filter-list attribute.
 * This is done by js to reduce burden on editors
 * If there's already a lang attribute in the tag, that tag is skipped.
 *
 * Note that this may still produce temporarily incorrect labelling
 * where text is awaiting translation.
 */
function addLangAttr() {

    // Temporarily treat as multilingual so all content is visible
    toggleRootClass("all")

    LANG_LIST.forEach(lang => {
        queryNodeList(`[its-locale-filter-list="${lang}"]`).forEach(elmtNode => {
            if (!elmtNode.lang) elmtNode.lang = lang
            })
        })
    }






// ------------------------------------------------------------
//  RUN INITIALISATION
// ------------------------------------------------------------

addLangAttr()
addSelfLinks()
}()






// ------------------------------------------------------------
//  BUTTON HIGHLIGHTS
// ------------------------------------------------------------

// Highlight the selected language button
function updateSelectedLanguageButton(lang) {

    const btnNodeList = document.querySelectorAll('#langSwitch > button')
    const btnNodeListArray = Array.from(btnNodeList)

    btnNodeListArray.forEach(btnNode => {
        // Extract the argument inside onclick="switchLang('xxx')"
        const onclickValue = btnNode.getAttribute('onclick') || ''
        const match = onclickValue.match(/switchLang\('([^']+)'\)/)
        const btnLang = match ? match[1] : null

        if (btnLang === lang) btnNode.classList.add('selectedLanguage')
        else btnNode.classList.remove('selectedLanguage')
        })
    }


