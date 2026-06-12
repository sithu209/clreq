"use strict";
(() => {

	// ------------------------------------------------------------
	//  CONSTANTS
	// ------------------------------------------------------------

	const LANG_LIST = ["en", "zh-hant", "zh-hans"]

	// Localisation dictionary (insert your full dictionary here)
	const L10N = {
        "en": {
            // CSS selectors for elements that need text replacement
            selector: {
              "head > title": "Requirements for Chinese Text Layout",
              "#abstract > h2": "Abstract",
              "#toc > ol > li:nth-child(1) > a": "Abstract",
              "#sotd > h2": "Status of This Document",
              "#toc > ol > li:nth-child(2) > a": "Status of This Document",
              "#table-of-contents": "Table of Contents",
              ".note-title": "Note"
              },
            // Prefix for figure captions (e.g., "Fig. 1", "Fig. 2")
            fig: "Fig. ",
            collapseSidebar: "Collapse Sidebar",
            expandSidebar: "Pop Out Sidebar",
            jumpToToc: "Jump to Table of Contents",
            dt: {},
            dd: {
                "Bug tracker:": '<a href="https://github.com/w3c/clreq/issues">file a bug</a> (<a href="https://github.com/w3c/clreq/issues">open bugs</a>)'
                }
            },
      "zh-hant": {
        selector: {
          "head > title": "\u4E2D\u6587\u6392\u7248\u9700\u6C42",
          "#abstract > h2": "\u6458\u8981",
          "#toc > ol > li:nth-child(1) > a": "\u6458\u8981",
          "#sotd > h2": "\u95DC\u65BC\u672C\u6587\u6A94",
          "#toc > ol > li:nth-child(2) > a": "\u95DC\u65BC\u672C\u6587\u6A94",
          "#table-of-contents": "\u5167\u5BB9\u5927\u7DB1",
          ".note-title": "\u6CE8"
          },
        fig: "\u5716",
        collapseSidebar: "\u6536\u8D77\u5074\u908A\u6B04",
        expandSidebar: "\u5F48\u51FA\u5074\u908A\u6B04",
        jumpToToc: "\u8DF3\u8F49\u81F3\u5167\u5BB9\u5927\u7DB1",
        summary: "\u95DC\u65BC\u6B64\u6587\u6A94",
        dt: {
          "This version:": "\u672C\u7248\u672C\uFF1A",
          "History:": "\u6B77\u53F2\uFF1A",
          "Previous version:": "\u4E0A\u4E00\u7248\uFF1A",
          "Latest published version:": "\u6700\u65B0\u767C\u4F48\u8349\u7A3F\uFF1A",
          "Latest editor's draft:": "\u6700\u65B0\u7DE8\u8F2F\u8349\u7A3F\uFF1A",
          "Editors:": "\u7DE8\u8F2F\uFF1A",
          "Former editors:": "\u539F\u7DE8\u8F2F\uFF1A",
          "Participate:": "\u5354\u52A9\u53C3\u8207\uFF1A",
          "Feedback:": "\u53CD\u994B\uFF1A",
          "Contributors:": "\u8CA2\u737B\u8005\uFF1A"
          },
        dd: {
          "Bug tracker:": '<a href="https://github.com/w3c/clreq/issues">\u53CD\u994B\u932F\u8AA4</a>\uFF08<a href="https://github.com/w3c/clreq/issues">\u4FEE\u6B63\u4E2D\u7684\u932F\u8AA4</a>\uFF09'
          }
        },
      "zh-hans": {
        selector: {
          "head > title": "\u4E2D\u6587\u6392\u7248\u9700\u6C42",
          "#abstract > h2": "\u6458\u8981",
          "#toc > ol > li:nth-child(1) > a": "\u6458\u8981",
          "#sotd > h2": "\u5173\u4E8E\u672C\u6587\u6863",
          "#toc > ol > li:nth-child(2) > a": "\u5173\u4E8E\u672C\u6587\u6863",
          "#table-of-contents": "\u5185\u5BB9\u5927\u7EB2",
          ".note-title": "\u6CE8"
          },
        fig: "\u56FE",
        collapseSidebar: "\u6536\u8D77\u4FA7\u8FB9\u680F",
        expandSidebar: "\u5F39\u51FA\u4FA7\u8FB9\u680F",
        jumpToToc: "\u8DF3\u8F6C\u81F3\u5185\u5BB9\u5927\u7EB2",
        summary: "\u5173\u4E8E\u6B64\u6587\u6863",
        dt: {
          "This version:": "\u672C\u7248\u672C\uFF1A",
          "History:": "\u5386\u53F2\uFF1A",
          "Previous version:": "\u4E0A\u4E00\u7248\uFF1A",
          "Latest published version:": "\u6700\u65B0\u53D1\u5E03\u8349\u7A3F\uFF1A",
          "Latest editor's draft:": "\u6700\u65B0\u7F16\u8F91\u8349\u7A3F\uFF1A",
          "Editors:": "\u7F16\u8F91\uFF1A",
          "Former editors:": "\u539F\u7F16\u8F91\uFF1A",
          "Participate:": "\u534F\u52A9\u53C2\u4E0E\uFF1A",
          "Feedback:": "\u53CD\u9988\uFF1A",
          "Contributors:": "\u8D21\u732E\u8005\uFF1A"
          },
        dd: {
          "Bug tracker:": '<a href="https://github.com/w3c/clreq/issues">\u53CD\u9988\u9519\u8BEF</a>\uFF08<a href="https://github.com/w3c/clreq/issues">\u4FEE\u6B63\u4E2D\u7684\u9519\u8BEF</a>\uFF09'
          }
        }
    }


	// Root <html> element
	const rootNode = document.documentElement

	// Tracks elements hidden during language switching
	let hiddenNodeList = []



	// ------------------------------------------------------------
	//  UTILITY HELPERS
	// ------------------------------------------------------------

	// Convert NodeList → Array
	function arrayify(obj) {
        return Array.from(obj)
        }

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
	function replaceBoilerplateText(lang) {

		const l10n = L10N[normalizeLang(lang)]

		// Replace text for fixed selectors
		for (const [selector, text] of Object.entries(l10n.selector)) {
			queryNodeList(selector).forEach(elmtNode => elmtNode.textContent = text)
            }

		// Replace figure caption prefixes
		queryNodeList("figcaption, .fig-ref").forEach(elmtNode => {
			if (elmtNode.firstChild) elmtNode.firstChild.textContent = l10n.fig
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

	let sidebarObserver = null

	// Update sidebar UI text (collapse/expand/jump)
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

	window.switchLang = function(lang) {
		toggleRootClass(lang)
		showAndHideLang(lang)
		replaceBoilerplateText(lang)
		updateSelectedLanguageButton(lang)
        }



	// ------------------------------------------------------------
	//  INITIALISATION HELPERS
	// ------------------------------------------------------------

	// Add self-links to <li id="..."> items
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

	// Add lang="" attributes to multilingual spans
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

    })()





// Highlight the selected language button
function updateSelectedLanguageButton(lang) {

    const btnNodeList = document.querySelectorAll('#langSwitch > button')
    const btnNodeListArray = Array.from(btnNodeList)

    btnNodeListArray.forEach($btn => {
        // Extract the argument inside onclick="switchLang('xxx')"
        const onclickValue = $btn.getAttribute('onclick') || ''
        const match = onclickValue.match(/switchLang\('([^']+)'\)/)
        const btnLang = match ? match[1] : null

        if (btnLang === lang) $btn.classList.add('selectedLanguage')
        else $btn.classList.remove('selectedLanguage')
        })
    }
