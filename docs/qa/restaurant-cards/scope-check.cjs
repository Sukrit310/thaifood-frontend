const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const postcss = require(path.join(root, 'thaifood/node_modules/postcss'));
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'source-baseline.json')));
const allowed = ['thaifood/src/components/RestaurantCard.jsx', 'thaifood/src/components/RestaurantGrid.jsx', 'thaifood/src/index.css', 'thaifood/src/pages/Home.css', 'thaifood/src/pages/Restaurants.css'];
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const changed = Object.entries(baseline).filter(([name, hash]) => digest(fs.readFileSync(path.join(root, name))) !== hash).map(([name]) => name).sort();
assert.deepEqual(changed, [...allowed].sort());
const cardSelector = /\.(restaurant-grid|restaurant-card|card-image-link|card-image|category-tag|card-content|card-meta|rating|card-address)(?![\w-])/;
function composition(css, isOriginal, name) {
  const ast = postcss.parse(css);
  ast.walkComments(c => c.remove());
  ast.walkRules(rule => {
    const retained = rule.selectors.filter(selector => !cardSelector.test(selector));
    if (!retained.length) { rule.remove(); return; }
    rule.selectors = retained;
    if (isOriginal && name.endsWith('/Home.css') && rule.selector === '.home-page .home-loading-grid') rule.walkDecls('gap', decl => { if (decl.value === '28px') decl.value = 'var(--space-6)'; });
  });
  ast.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
  const serialize = node => ({ type: node.type, ...(node.selector ? { selector: node.selector.replace(/\s+/g, ' ').trim() } : {}), ...(node.name ? { name: node.name, params: node.params } : {}), ...(node.prop ? { prop: node.prop, value: node.value, important: Boolean(node.important) } : {}), ...(node.nodes ? { nodes: node.nodes.map(serialize) } : {}) });
  return serialize(ast);
}
const cssChecked = [];
for (const name of allowed.filter(n => n.endsWith('.css'))) {
  const previous = execFileSync('git', ['show', 'HEAD:' + name], { cwd: root });
  assert.equal(digest(previous), baseline[name], 'HEAD is not the recorded pre-task CSS: ' + name);
  const before = composition(previous.toString(), true, name), after = composition(fs.readFileSync(path.join(root, name), 'utf8'), false, name);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    fs.writeFileSync(path.join(__dirname, 'scope-failure.json'), JSON.stringify({ name, before, after }, null, 2));
    throw new Error('Unrelated page composition changed: ' + name + '; see scope-failure.json');
  }
  cssChecked.push(name);
}
const result = { status: 'passed', baselineFiles: Object.keys(baseline).length, changedExistingFiles: changed, extractedCssChecked: cssChecked, allowedRelatedAdjustment: 'Home loading-grid gap28px -> shared24px', priorLayoutAndAllOtherSourceUnchanged: true };
fs.writeFileSync(path.join(__dirname, 'scope.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
