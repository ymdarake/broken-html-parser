// IDENTIFIER -> ILLEGAL ... convert IDENTIFIER to STRING
// TAG_START -> IDENTIFIER(tagname) -> props(IDENTIFIER +? (BIND + STRING)) * 0~N
// TAG_END -> IDENTIFIER -> TAG_CLOSE
// COMMENT

import { Lexer } from './lexer.js';
import {
  Token,
  COMMENT,
  TAG_START,
  IDENTIFIER,
  BIND,
  STRING,
  SINGLE_TAG_END,
  TAG_CLOSE,
  TAG_END,
  TEXT_NODE,
  EOF,
  ILLEGAL,
} from './token.js';
import {
  Document,
  Node,
  CommentNode,
  TagNode,
  Property,
  PropertyValue,
  IllegalTagNode,
  TextNode,
} from './ast.js';

// skip first, second my-infolist-body
// skip second text-align:right;margin-top:5px;
export class Parser {
  public errors: Array<string>;
  // DEBUG: private
  public currentToken: Token | null = null;
  private peekToken: Token | null = null;
  private tableSkippedCount = 0;
  private isFirstTargetableDivSkipped = false;

  constructor(private lexer: Lexer) {
    this.errors = [];
    this.nextToken();
    this.nextToken();
  }

  public parseDocument(): Document {
    if (this.currentToken == null) {
      throw new Error('parser token not initialized');
    }
    const document = new Document();
    while (this.currentToken.type !== EOF) {
      document.nodes.push(this.parseNode());
    }
    return document;
  }

  private parseNode(): Node {
    if (this.currentToken == null || this.peekToken === null) {
      throw new Error(`[line:${this.lexer.lineNumber}]: token is null`);
    }

    switch (this.currentToken.type) {
      case COMMENT:
        this.nextToken();
        return new CommentNode();
      case TEXT_NODE:
        const text = new TextNode(this.currentToken.literal);
        this.nextToken();
        return text;
      case TAG_END:
        this.nextToken();
        const name = this.currentToken.literal;
        // TODO: token type check
        this.nextToken(); // skip tag name
        this.nextToken(); // skip tag close
        return new IllegalTagNode(name);
      case TAG_START:
        this.nextToken(); // skip '<' token
        const tagName = this.currentToken.literal;
        const node = new TagNode(tagName);
        this.nextToken(); // skip tagName
        node.properties = this.parseProperties();

        if (
          this.tableSkippedCount < 2 &&
          node.properties.some(function (prop) {
            if (prop.value === null) {
              return false;
            }
            return (
              prop.value.length === 1 &&
              !!~prop.value.indexOf('my-infolist-body')
            );
          })
        ) {
          this.tableSkippedCount++;
          while (
            !(
              this.currentToken.literal === '</' &&
              this.peekToken.literal === 'table'
            )
          ) {
            this.nextToken();
          }
          this.nextToken();
          this.nextToken();
          this.nextToken();
          return node;
        }
        if (
          node.properties.some(function (prop) {
            if (prop.value === null) {
              return false;
            }
            return (
              prop.value.length === 1 &&
              !!~prop.value.indexOf('text-align:right;margin-top:5px;')
            );
          })
        ) {
          if (this.isFirstTargetableDivSkipped) {
            this.nextToken();
            return node;
          }
          this.isFirstTargetableDivSkipped = true;
        }

        if (String(this.currentToken.type) === SINGLE_TAG_END) {
          this.nextToken();
          return node;
        }

        // NOTE: tags without explicit ending /
        if (this.isNoExplicitEndingTag(node.tagName)) {
          // TODO: <input ...>hogehoge</input>
          // this.endTagSkippedTagStack.push(node);
          if (this.currentToken.literal === '>') {
            this.nextToken(); // skip '>' as ending.
            return node;
          }
        }

        if (String(this.currentToken.type) !== TAG_CLOSE) {
          throw new Error(
            `[line:${this.lexer.lineNumber}]: expected TAG_CLOSE, got ${this.currentToken.type}(${this.currentToken.literal})`
          );
        }

        this.nextToken(); // skip TAG_CLOSE

        // NOTE: parse children. (multiple nodes in the same depth.)
        while (
          !(
            String(this.currentToken.type) === TAG_END &&
            this.peekToken.literal === tagName
          )
        ) {
          const child = this.parseNode();
          node.children.push(child);
        }

        if (String(this.currentToken.type) !== TAG_END) {
          throw new Error(
            `[line:${this.lexer.lineNumber}]: expected TAG_END, got ${this.currentToken.type}(${this.currentToken.literal})`
          );
        }

        if (
          String(this.currentToken.type) === TAG_END &&
          this.peekToken.literal === node.tagName
        ) {
          this.nextToken(); // skip '</' token.
          this.nextToken(); // skip tagname
          this.nextToken(); // skip '>' token
          return node;
        }

        if (String(this.currentToken.type) !== IDENTIFIER) {
          throw new Error(
            `[line:${this.lexer.lineNumber}]: expected IDENTIFIER(for ending tag name), got ${this.currentToken.type}(${this.currentToken.literal})`
          );
        }

        if (this.currentToken.literal !== tagName) {
          throw new Error(
            `[line:${this.lexer.lineNumber}]: expected ending for tag '${tagName}', got ${this.currentToken.literal}`
          );
        }

        this.nextToken();
        return node;
      default:
        throw new Error(
          `[line:${this.lexer.lineNumber}]: expected COMMENT or TAG_START, got ${this.currentToken.type}(${this.currentToken.literal})`
        );
    }
  }

  private parseProperties(): Array<Property> {
    if (this.currentToken === null) {
      throw new Error(`[line:${this.lexer.lineNumber}]: token is null`);
    }

    const properties: Array<Property> = [];

    // stop when TAG_CLOSE or SINGLE_TAG_END
    // NOTE: can parse <link rel=stylesheet" />
    // TODO: parse below
    // <link rel=stylesheet' /> -->
    // <link rel=stylesheet" other="hogehoge"/>
    // <link rel=stylesheet" other=hogehoge"/>
    // <link rel=stylesheet" other='hogehoge'/>
    while (
      this.currentToken.type === IDENTIFIER ||
      this.currentToken.type === STRING ||
      this.currentToken.type === ILLEGAL
    ) {
      const name = this.currentToken.literal;
      const property = new Property(name);
      this.nextToken(); //skip name

      // NOTE: prop without value
      // @ts-ignore
      if (this.currentToken.type !== BIND) {
        properties.push(property);
        continue;
      }
      this.nextToken(); // skip BIND
      // sit in value here: STRING | (IDENTIFIER -> ILLEGAL)
      if (
        String(this.currentToken.type) !== STRING &&
        String(this.currentToken.type) !== IDENTIFIER // ts workaround
      ) {
        throw new Error(
          `[line:${this.lexer.lineNumber}]: expected STRING or IDENTIFIER, got ${this.currentToken.type}(${this.currentToken.literal})`
        );
      }
      property.value = this.parsePropertyValue(this.currentToken.literal);
      properties.push(property);
      this.nextToken(); // skip property value

      // skip until /> if next property starts with ILLEGAL or STRING token.
      if (
        this.currentToken.type === STRING ||
        this.currentToken.type === ILLEGAL
      ) {
        while (this.currentToken.literal !== '/>') {
          this.nextToken();
        }
        return properties;
      }
    }
    return properties;
  }

  private nextToken() {
    this.currentToken = this.peekToken;
    this.peekToken = this.lexer.nextToken();
  }

  private parsePropertyValue(value: string): PropertyValue {
    return value.split(/\s/);
  }

  private isNoExplicitEndingTag(tagName: string): boolean {
    return !!~[
      'img',
      'input',
      'hr',
      'area',
      'link',
      'br',
      'meta',
      'base',
      'col',
      'embed',
      'keygen',
      'param',
      'source',
      'track',
      'wbr',
    ].indexOf(tagName);
  }
}
