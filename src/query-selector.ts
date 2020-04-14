import { Node, Property } from './ast.js';

export function first(node: Node, className: string): Node | null {
  const cls: Array<Property> = node.properties.filter(
    (prop) => prop.name === 'class'
  );
  // @ts-ignore
  if (cls.length > 0 && cls[0].value && !!~cls[0].value.indexOf(className)) {
    return node;
  }
  if (!node.children.length) {
    return null;
  }

  for (var i = 0; i < node.children.length; ++i) {
    const child = node.children[i];
    const res = first(child, className);
    if (res !== null) {
      return res;
    }
  }
  return null;
}

export function all(node: Node, className: string): Array<Node> {
  const result = [];
  const cls: Array<Property> = node.properties.filter(
    (prop) => prop.name === 'class'
  );
  // @ts-ignore
  if (cls.length > 0 && cls[0].value && !!~cls[0].value.indexOf(className)) {
    result.push(node);
  }
  if (!node.children.length) {
    return result;
  }

  for (var i = 0; i < node.children.length; ++i) {
    const child = node.children[i];
    const res = all(child, className);
    if (res !== null) {
      result.push(...res);
    }
  }
  return result;
}
