import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const filePath = resolve('apps/pdr/content/headless-semantic-layer.mdx');
const content = readFileSync(filePath, 'utf8');

if (content.includes('<pre>') || content.includes('className="language-')) {
  console.error(
    'headless-semantic-layer.mdx still uses raw <pre><code> blocks instead of rendered code-block components.',
  );
  process.exit(1);
}

console.log('headless-semantic-layer.mdx uses component-based code blocks.');
