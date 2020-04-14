import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { all, first } from './query-selector.js';
import axios from 'axios';
import * as fs from 'fs';
import { prettyPrint } from './util.js';
import { EOF } from './token.js';

main();

function main() {
  getSourceHtml().then((html) => {
    const lexer = new Lexer(html);
    // let token;
    // while ((token = lexer.nextToken()) && token.type !== EOF) {
    //   console.warn(token.type, token.literal);
    // }
    const parser = new Parser(lexer);
    // TODO: eval to DOM
    try {
      const document = parser.parseDocument();
      document.nodes.forEach((n) => {
        prettyPrint(n, 0);
      });
    } catch (e) {
      console.error(e);
    }
  });
}

function getSourceHtml(): Promise<string> {
  // return axios.get('https://www.yahoo.co.jp').then((res) => {
  //   fs.writeFileSync('./test-data/www.yahoo.co.jp.html', res.data);
  //   return res.data;
  // });
  return Promise.resolve(fs.readFileSync('./test/data/illegal.html', 'utf8'));
}
