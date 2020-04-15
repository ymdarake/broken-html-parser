import { Lexer } from './lexer.js';
// import { Parser } from './parser.js';
import { Parser } from './17-parser.js';
import { process } from './17.js';
import { all, first } from './query-selector.js';

main();

function main() {
  // @ts-ignore
  const html = `<html>${window.document.documentElement.innerHTML}</html>`;
  const lexer = new Lexer(html);
  const parser = new Parser(lexer);
  // TODO: eval to DOM
  try {
    const document = parser.parseDocument();
    document.nodes.forEach((n) => {
      // @ts-ignore
      window.response = process(all(n, 'courselist-c'));
    });
  } catch (e) {
    console.error(e);
  }
}
