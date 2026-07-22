import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const browserCandidates = [
  process.env.BROWSER_BIN,
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'microsoft-edge',
  'microsoft-edge-stable',
  'brave-browser',
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
].filter(Boolean);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function findBrowser() {
  for (const candidate of browserCandidates) {
    if (candidate.includes('/') && !existsSync(candidate)) continue;

    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (!result.error && result.status === 0) return candidate;
  }

  throw new Error('A supported browser was not found. Set BROWSER_BIN to its executable path.');
}

async function startStaticServer() {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname);
      const relativePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
      const filePath = resolve(root, `.${relativePath}`);

      if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      const content = await readFile(filePath);
      response.writeHead(200, {
        'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    }
    catch {
      response.writeHead(404).end('Not found');
    }
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('The local test server did not expose a port.');

  return {
    origin: `http://127.0.0.1:${address.port}`,
    server,
  };
}

function closeStaticServer(server) {
  return new Promise((resolvePromise, rejectPromise) => {
    server.close(error => {
      if (error) rejectPromise(error);
      else resolvePromise();
    });
  });
}

function withTimeout(promise, milliseconds, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), milliseconds);

    promise.then(value => {
      clearTimeout(timeout);
      resolve(value);
    }, error => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function createProtocolClient(child) {
  const input = child.stdio[3];
  const output = child.stdio[4];
  const pending = new Map();
  let buffer = '';
  let nextId = 1;
  let stderr = '';

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => stderr += chunk);
  output.setEncoding('utf8');
  output.on('data', chunk => {
    buffer += chunk;

    while (buffer.includes('\0')) {
      const separator = buffer.indexOf('\0');
      const rawMessage = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 1);
      if (!rawMessage) continue;

      const message = JSON.parse(rawMessage);
      const request = pending.get(message.id);
      if (!request) continue;

      pending.delete(message.id);
      if (message.error) request.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else request.resolve(message.result);
    }
  });

  function rejectPending(error) {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  }

  child.once('error', rejectPending);
  child.once('exit', (code, signal) => {
    if (pending.size > 0) {
      rejectPending(new Error(`The browser exited early with code ${code} and signal ${signal}.\n${stderr}`));
    }
  });

  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = nextId;
      nextId += 1;
      pending.set(id, { resolve, reject });

      const message = { id, method, params };
      if (sessionId) message.sessionId = sessionId;
      input.write(`${JSON.stringify(message)}\0`);
    });
  }

  return {
    getStderr: () => stderr,
    send,
  };
}

function waitForExit(child) {
  return new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
}

async function evaluate(client, sessionId, expression) {
  const evaluation = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId);

  if (evaluation.exceptionDetails) {
    throw new Error(evaluation.exceptionDetails.exception?.description || 'Browser evaluation failed.');
  }

  return evaluation.result.value;
}

async function waitForRespecDocument(client, sessionId) {
  const deadline = Date.now() + 20000;
  let state;

  while (Date.now() < deadline) {
    state = await evaluate(client, sessionId, `({
      readyState: document.readyState,
      hasLanguageSwitcher: typeof window.switchLang === 'function',
      hasDocumentHead: Boolean(document.querySelector('body > div.head > details')),
      hasAbstractHeading: Boolean(document.querySelector('#abstract > h2')),
      hasStatusHeading: Boolean(document.querySelector('#sotd > h2')),
      hasToc: Boolean(document.querySelector('#toc > ol')),
      hasSidebar: Boolean(document.querySelector('#toc-toggle')),
      hasSidebarText: Boolean(
        document.querySelector('#toc-collapse-text')
        && document.querySelector('#toc-jump-text')
      ),
    })`);

    if (
      state.readyState === 'complete'
      && state.hasLanguageSwitcher
      && state.hasDocumentHead
      && state.hasAbstractHeading
      && state.hasStatusHeading
      && state.hasToc
      && state.hasSidebar
      && state.hasSidebarText
    ) return;

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`The document did not finish rendering. Last state: ${JSON.stringify(state)}`);
}

async function selectLanguage(client, sessionId, lang) {
  return evaluate(client, sessionId, `(() => {
    const lang = ${JSON.stringify(lang)};
    const button = [...document.querySelectorAll('#langSwitch > button')]
      .find(candidate => candidate.getAttribute('onclick') === \`switchLang('\${lang}')\`);
    if (!button) throw new Error(\`Missing \${lang} language button\`);
    button.click();

    return {
      rootLang: document.documentElement.lang,
      isMultilingual: document.documentElement.classList.contains('is-multilingual'),
      isSingleLanguage: document.documentElement.classList.contains('isnt-multilingual'),
      documentTitle: document.title,
      abstractHeading: document.querySelector('#abstract > h2')?.textContent.trim(),
      statusHeading: document.querySelector('#sotd > h2')?.textContent.trim(),
      tocHeading: document.querySelector('#table-of-contents')?.textContent.trim(),
      sidebarCollapseText: document.querySelector('#toc-collapse-text')?.textContent.trim(),
      sidebarJumpText: document.querySelector('#toc-jump-text')?.textContent.trim(),
      documentSummary: document.querySelector('body > div.head > details > summary')?.textContent.trim(),
      selectedLanguage: document.querySelector('#langSwitch > button.selectedLanguage')
        ?.getAttribute('onclick')
        ?.match(/switchLang\\('([^']+)'\\)/)?.[1],
      visibleAbstractLanguages: [...document.querySelectorAll('#abstract > [its-locale-filter-list]')]
        .filter(element => !element.hidden)
        .map(element => element.getAttribute('its-locale-filter-list')),
    };
  })()`);
}

async function waitForText(client, sessionId, selector, expected) {
  const deadline = Date.now() + 2000;
  let text;

  while (Date.now() < deadline) {
    text = await evaluate(
      client,
      sessionId,
      `document.querySelector(${JSON.stringify(selector)})?.textContent.trim()`,
    );
    if (text === expected) return text;
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  throw new Error(`${selector} did not become ${JSON.stringify(expected)}. Last text: ${JSON.stringify(text)}`);
}

async function closeBrowser(client, child) {
  const exit = waitForExit(child);

  try {
    await withTimeout(client.send('Browser.close'), 1000, 'Browser.close did not respond.');
  }
  catch {
    child.kill('SIGTERM');
  }

  const result = await withTimeout(exit, 5000, 'The browser did not exit after the DOM test.');
  assert.equal(result.signal, null, client.getStderr());
  assert.equal(result.code, 0, client.getStderr());
}

test('language switching works in the document', async () => {
  const browser = findBrowser();
  const staticServer = await startStaticServer();
  const documentUrl = `${staticServer.origin}/index.html`;
  const profilePath = join(tmpdir(), 'clreq-language-switching-profile');
  const child = spawn(browser, [
    '--headless',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-gpu',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-pings',
    '--no-first-run',
    '--no-default-browser-check',
    '--password-store=basic',
    '--use-mock-keychain',
    '--window-size=1280,800',
    `--user-data-dir=${profilePath}`,
    '--remote-debugging-pipe',
    'about:blank',
  ], {
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
  });
  const client = createProtocolClient(child);

  try {
    const target = await withTimeout(
      client.send('Target.createTarget', { url: documentUrl }),
      5000,
      'The browser did not create the ReSpec test page.',
    );
    const attached = await client.send('Target.attachToTarget', {
      targetId: target.targetId,
      flatten: true,
    });
    await client.send('Runtime.enable', {}, attached.sessionId);
    await waitForRespecDocument(client, attached.sessionId);

    const simplified = await selectLanguage(client, attached.sessionId, 'zh-hans');
    assert.deepEqual(simplified, {
      rootLang: 'zh-hans',
      isMultilingual: false,
      isSingleLanguage: true,
      documentTitle: '中文排版需求',
      abstractHeading: '摘要',
      statusHeading: '关于本文档',
      tocHeading: '内容大纲',
      sidebarCollapseText: '收起侧边栏',
      sidebarJumpText: '跳转至内容大纲',
      documentSummary: '关于此文档',
      selectedLanguage: 'zh-hans',
      visibleAbstractLanguages: ['zh-hans'],
    });

    const traditional = await selectLanguage(client, attached.sessionId, 'zh-hant');
    assert.deepEqual(traditional, {
      rootLang: 'zh-hant',
      isMultilingual: false,
      isSingleLanguage: true,
      documentTitle: '中文排版需求',
      abstractHeading: '摘要',
      statusHeading: '關於本文檔',
      tocHeading: '內容大綱',
      sidebarCollapseText: '收起側邊欄',
      sidebarJumpText: '跳轉至內容大綱',
      documentSummary: '關於此文檔',
      selectedLanguage: 'zh-hant',
      visibleAbstractLanguages: ['zh-hant'],
    });

    await evaluate(client, attached.sessionId, `document.querySelector('#toc-toggle').click()`);
    await waitForText(client, attached.sessionId, '#toc-expand-text', '彈出側邊欄');
    await evaluate(client, attached.sessionId, `document.querySelector('#toc-toggle').click()`);
    await waitForText(client, attached.sessionId, '#toc-collapse-text', '收起側邊欄');

    const english = await selectLanguage(client, attached.sessionId, 'en');
    assert.equal(english.rootLang, 'en');
    assert.equal(english.isMultilingual, false);
    assert.equal(english.isSingleLanguage, true);
    assert.equal(english.documentTitle, 'Requirements for Chinese Text Layout');
    assert.equal(english.abstractHeading, 'Abstract');
    assert.equal(english.statusHeading, 'Status of This Document');
    assert.equal(english.tocHeading, 'Table of Contents');
    assert.equal(english.sidebarCollapseText, 'Collapse Sidebar');
    assert.equal(english.sidebarJumpText, 'Jump to Table of Contents');
    assert.equal(english.selectedLanguage, 'en');
    assert.deepEqual(english.visibleAbstractLanguages, ['en']);

    const multilingual = await selectLanguage(client, attached.sessionId, 'all');
    assert.equal(multilingual.rootLang, 'en');
    assert.equal(multilingual.isMultilingual, true);
    assert.equal(multilingual.isSingleLanguage, false);
    assert.equal(multilingual.documentTitle, 'Requirements for Chinese Text Layout');
    assert.equal(multilingual.abstractHeading, 'Abstract');
    assert.equal(multilingual.statusHeading, 'Status of This Document');
    assert.equal(multilingual.tocHeading, 'Table of Contents');
    assert.equal(multilingual.sidebarCollapseText, 'Collapse Sidebar');
    assert.equal(multilingual.sidebarJumpText, 'Jump to Table of Contents');
    assert.equal(multilingual.selectedLanguage, 'all');
    assert.deepEqual(multilingual.visibleAbstractLanguages, ['en', 'zh-hans', 'zh-hant']);
  }
  finally {
    await closeBrowser(client, child);
    await closeStaticServer(staticServer.server);
  }
});
