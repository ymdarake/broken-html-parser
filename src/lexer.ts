import {
  Token,
  COMMENT,
  TAG_START,
  SINGLE_TAG_END,
  TAG_END,
  TAG_CLOSE,
  IDENTIFIER,
  TEXT_NODE,
  STRING,
  BIND,
  EOF,
  ILLEGAL,
} from './token.js';

const ASCII_CODE_NULL = 0;
type ASCII_CODE_NULL = 0;
type LexOutput = string | ASCII_CODE_NULL;

export class Lexer {
  public lineNumber = 1;
  public columnNumber = 0;
  private position = 0;
  private readPosition = 0;
  private char: LexOutput = '';
  private isLexingTag: boolean = false;
  private isLexingTagName: boolean = false;
  private isLexingTagEnding: boolean = false;
  private isLexingScriptOrStyleContent: boolean = false;

  constructor(private input: string) {
    this.readChar();
  }

  public nextToken(): Token {
    var token;
    this.skipWhitespace();

    switch (this.char) {
      case '<':
        // TAG_END
        if (this.peekChar() === '/') {
          this.readChar();
          this.readChar();
          token = new Token(TAG_END, '</');
          this.isLexingTag = true;
          this.isLexingTagEnding = true;
          return token;
        }
        if (this.peekChar() === '!') {
          // doctype or comment
          // skip until >
          // TODO: tell them apart.
          this.skipUntilTagClose();
          return new Token(COMMENT, '<!--');
        }
        token = new Token(TAG_START, this.char);
        this.isLexingTag = true;
        this.isLexingTagName = true;
        this.readChar();
        return token;
      case '>':
        // TAG_CLOSE
        token = new Token(TAG_CLOSE, this.char);
        this.isLexingTag = false;
        this.isLexingTagEnding = false;
        this.readChar();
        return token;
      case '/':
        // NOTE: comment in the start of inline scripts or styles.
        if (this.isLexingScriptOrStyleContent) {
          return new Token(TEXT_NODE, this.readTextNode());
        }
        this.skipWhitespace();
        if (this.peekChar() === '>') {
          // <hoge />
          this.readChar(); // skip /
          this.readChar(); // skip >
          token = new Token(SINGLE_TAG_END, '/>');
          this.isLexingTag = false;
          return token;
        }
        throw new Error(
          `[line: ${this.lineNumber}, column: ${this.columnNumber}, position: ${this.position}]unexpected /`
        );
      case '"':
        if (this.isIllegalString(`"`)) {
          token = new Token(ILLEGAL, this.char);
          this.readChar();
          return token;
        }
        token = new Token(STRING);
        token.literal = this.readString(`"`);
        this.readChar();
        return token;
      case `'`:
        if (this.isIllegalString(`'`)) {
          token = new Token(ILLEGAL, this.char);
          this.readChar();
          return token;
        }
        token = new Token(STRING);
        token.literal = this.readString(`'`);
        this.readChar();
        return token;
      case '=':
        token = new Token(BIND, this.char);
        this.readChar();
        return token;
      case 0:
        token = new Token(EOF, '');
        this.readChar();
        return token;
      default:
        // tag name or property name or text node.
        if (this.isLexingTag) {
          token = new Token(IDENTIFIER, this.readIdentifier());
          if (this.isLexingTagName) {
            this.isLexingScriptOrStyleContent =
              token.literal === 'script' || token.literal === 'style';
            this.isLexingTagName = false;
          }
          this.skipWhitespace();
          // </hogehoeg>
          if (this.isLexingTagEnding) {
            if (this.char !== '>') {
              throw new Error(
                `[line: ${this.lineNumber}, column: ${this.columnNumber}, position:${this.position}]lexing tag ending: expected >, got ${this.char}`
              );
            }
          }
          return token;
        }
        // this.isLexingTag will be set as true only in the "case '<'" block above.
        // NOTE: readIdentifier, readTextNode steps forward the last char,
        // so let here skip calling final 'this.readChar()'.
        return new Token(TEXT_NODE, this.readTextNode());
    }
  }

  private readChar() {
    this.char =
      this.readPosition >= this.input.length
        ? ASCII_CODE_NULL
        : this.input[this.readPosition];

    ++this.columnNumber;
    if (this.char === '\n' || this.char === '\r') {
      ++this.lineNumber;
      this.columnNumber = 0;
    }

    this.position = this.readPosition;
    ++this.readPosition;
  }

  private peekChar(extraForwardPosition: number = 0) {
    const position = this.readPosition + extraForwardPosition;
    if (position >= this.input.length) {
      return ASCII_CODE_NULL;
    }
    return this.input[position];
  }

  private readString(separator: string) {
    this.readChar(); // skip starting '"'
    const startIndex = this.position;
    while (this.char !== separator) {
      this.readChar();
    }
    return this.input.slice(startIndex, this.position);
  }

  private readIdentifier() {
    const startIndex = this.position;
    while (this.isIdentifierLetter(this.char)) {
      this.readChar();
    }
    const result = this.input.slice(startIndex, this.position);
    if (result.length === 0) {
      throw new Error(
        `[line:${this.lineNumber}, column: ${this.columnNumber}, position:${this.position}]unexpected identifier: '${this.char}'.`
      );
    }
    return result;
  }

  private readTextNode() {
    // NOTE: script content like
    // console.log('</') mustn't let us get out of text nodes.
    const startIndex = this.position;
    while (this.isLexingScriptOrStyleContent || this.char !== '<') {
      if (
        this.isLexingScriptOrStyleContent &&
        (this.isSittingOnEndingScriptTag() || this.isSittingOnEndingStyleTag())
      ) {
        break;
      }
      this.readChar();
    }
    return this.input.slice(startIndex, this.position);
  }

  private isSittingOnEndingScriptTag() {
    if (
      !(
        this.char === '<' &&
        this.peekChar() === '/' &&
        this.peekChar(1) === 's' &&
        this.peekChar(2) === 'c' &&
        this.peekChar(3) === 'r' &&
        this.peekChar(4) === 'i' &&
        this.peekChar(5) === 'p' &&
        this.peekChar(6) === 't'
      )
    ) {
      return false;
    }
    const ending = this.peekChar(7);
    if (ending === '>') {
      return true;
    }
    return typeof ending === 'string' && ending.match(/\s/);
  }

  private isSittingOnEndingStyleTag() {
    if (
      !(
        this.char === '<' &&
        this.peekChar() === '/' &&
        this.peekChar(1) === 's' &&
        this.peekChar(2) === 't' &&
        this.peekChar(3) === 'y' &&
        this.peekChar(4) === 'l' &&
        this.peekChar(5) === 'e'
      )
    ) {
      return false;
    }
    const ending = this.peekChar(6);
    if (ending === '>') {
      return true;
    }
    return typeof ending === 'string' && ending.match(/\s/);
  }

  private skipWhitespace() {
    while (typeof this.char === 'string' && this.char.match(/\s/)) {
      this.readChar();
    }
  }

  private skipUntilTagClose() {
    while (typeof this.char === 'string' && this.char !== '>') {
      this.readChar();
    }
    this.readChar();
  }

  private isLetter(char: string) {
    return char.length === 1 && char.match(/[a-z]/i);
  }

  private isDigit(char: string) {
    return char.length === 1 && char.match(/[0-9]/);
  }

  private isIdentifierLetter(char: LexOutput) {
    if (char === ASCII_CODE_NULL) {
      return false;
    }

    return (
      this.isLetter(char) ||
      this.isDigit(char) ||
      char === '-' ||
      char === '_' ||
      char === ':' ||
      char === '%' // NOTE: dealing with 'width=100%'
    );
  }

  // TODO: move to parser
  // NOTE: class=hogehoge" fldafjlkasjfklsa>
  private isIllegalString(separator: string) {
    const position = this.position;
    const readPosition = this.readPosition;
    const char = this.char;
    const isLexingTag = this.isLexingTag;
    const isLexingTagName = this.isLexingTagName;
    const isLexingTagEnding = this.isLexingTagEnding;
    const isLexingScriptOrStyleContent = this.isLexingScriptOrStyleContent;

    let isIllegal = true;
    this.readChar();
    while (this.char !== '>') {
      if (this.char === separator) {
        isIllegal = false;
        break;
      }
      this.readChar();
    }
    this.position = position;
    this.readPosition = readPosition;
    this.char = char;
    this.isLexingTag = isLexingTag;
    this.isLexingTagName = isLexingTagName;
    this.isLexingTagEnding = isLexingTagEnding;
    this.isLexingScriptOrStyleContent = isLexingScriptOrStyleContent;
    return isIllegal;
  }
}
