import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const widgetDirectory = path.resolve(moduleDirectory, '../widget');

async function inlineAsset(
  html: string,
  pattern: RegExp,
  wrapper: (source: string) => string
): Promise<string> {
  const match = html.match(pattern);
  if (!match?.[1]) return html;

  const source = await readFile(path.resolve(widgetDirectory, match[1]), 'utf8');
  const replacement = wrapper(source);
  return html.replace(match[0], () => replacement);
}

/**
 * MCP UI resources are served from a ui:// URI rather than a normal web
 * origin. Inline the Vite assets so the iframe does not need undeclared
 * network access and the resource can use an empty CSP allowlist.
 */
export async function loadWidgetHtml(): Promise<string> {
  let html = await readFile(path.resolve(widgetDirectory, 'index.html'), 'utf8');
  html = await inlineAsset(
    html,
    /<link[^>]+href=["']\.\/([^"']+\.css)["'][^>]*>/,
    (source) => `<style>${source.replace(/<\/style/gi, '<\\/style')}</style>`
  );
  html = await inlineAsset(
    html,
    /<script[^>]+src=["']\.\/([^"']+\.js)["'][^>]*><\/script>/,
    (source) => `<script type="module">${source.replace(/<\/script/gi, '<\\/script')}</script>`
  );
  return html;
}
