import { Node } from './ast.js';

export function prettyPrint(node: Node, depth: number) {
  const indent = new Array(depth).fill('\t').join('');
  console.log(`${indent}${node.tagName}`);
  if (node.isIllegal) {
    console.log(
      `${indent}${new Array(node.tagName.length).fill('^').join('')}`
    );
  }
  console.log(
    `${indent}\t${node.properties
      .map((prop) => `{ ${prop.name}: [${prop.value}] }`)
      .join(`\n${indent}\t`)}`
  );
  node.children.forEach((child) => {
    prettyPrint(child, depth + 1);
  });
}
