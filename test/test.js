const fs = require('fs');
const assert = require('assert');
const Lexer = require('../dist/lexer.js').Lexer;
const Parser = require('../dist/parser.js').Parser;

describe('Parser', function () {
  describe('#parseDocument', function () {
    it('should parse valid html files correctly', function () {
      [
        'chrome-top',
        'illegal',
        'script',
        'singleline-element',
        'template',
        'text-node',
        'www.google.com',
        'www.google.com.2',
        'www.google.com',
        'www.yahoo.co.jp',
      ].forEach((filelName) => {
        const html = fs.readFileSync(`./test/data/${filelName}.html`, 'utf8');
        const lexer = new Lexer(html);
        const parser = new Parser(lexer);
        parser.parseDocument().nodes.forEach((node) => {
          assert.equal(node.children instanceof Array, true);
        });
      });
    });
  });
  describe('#parseDocument', function () {
    it('should throw error with unknown broken html files', function () {
      [
        {
          fileName: 'broken-lex-error',
          message: '[line: 4, column: 7, position: 48]unexpected /',
        },
        {
          fileName: 'broken-parse-error',
          message: '[line:4]: expected TAG_CLOSE, got TAG_START(<)',
        },
      ].forEach(({ fileName, message }) => {
        const html = fs.readFileSync(`./test/data/${fileName}.html`, 'utf8');
        const lexer = new Lexer(html);
        const parser = new Parser(lexer);
        try {
          parser.parseDocument();
          assert.equal(true, false);
        } catch (e) {
          assert.equal(e.message, message);
        }
      });
    });
  });
});
