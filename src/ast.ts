// NOTE: comment, doctype, html tag
export class Document {
  public nodes: Array<Node> = [];
}

export class Node {
  public isIllegal: boolean = false;
  public children: Array<Node> = [];
  public properties: Array<Property> = [];
  constructor(public tagName: string) {}
}

export class TagNode extends Node {}
export class IllegalTagNode extends TagNode {
  public isIllegal: boolean = true;
}

export class TextNode extends Node {
  constructor(public content: string) {
    super('TextNode');
  }
}

export class CommentNode extends Node {
  constructor() {
    super('Comment');
  }
}

export class Property {
  public value: PropertyValue | null = null;
  constructor(public name: string) {}
}

export type PropertyValue = Array<string>;
