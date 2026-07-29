import fs from 'fs';

const content = fs.readFileSync('node_modules/movi-player/dist/element.js', 'utf8');

const pos = content.indexOf('this.hasAttribute("tabindex") || this.setAttribute("tabindex", "0")');
if (pos !== -1) {
  // Search backwards to find the function start
  const sub = content.slice(pos - 4000, pos + 500);
  console.log('Context of tabindex call:');
  console.log(sub);
} else {
  console.log('Not found');
}
