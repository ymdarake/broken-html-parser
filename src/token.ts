export const ILLEGAL = 'ILLEGAL';
export const EOF = 'EOF';
export const COMMENT = 'COMMENT';
export const IDENTIFIER = 'IDENTIFIER';
export const STRING = 'STRING';
export const TEXT_NODE = 'TEXT_NODE';
export const TAG_START = 'TAG_START';
export const SINGLE_TAG_END = 'SINGLE_TAG_END';
export const TAG_CLOSE = 'TAG_CLOSE';
export const TAG_END = 'TAG_END';
export const BIND = 'BIND';

export type TokenType = string;

export class Token {
  constructor(public type: TokenType, public literal: string = '') {}
}
