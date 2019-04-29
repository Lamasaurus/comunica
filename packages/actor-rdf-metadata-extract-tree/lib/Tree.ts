import { TreeNode } from "./TreeNode";

export class Tree {
  private nodes: { [id: string]: TreeNode } = {};
  private loadingNode: TreeNode;

  constructor(nodes: { [id: string]: TreeNode }) {
    this.nodes = nodes;
  }

  public combineWithTree(tree: Tree) {
    const otherTreeNodes = tree.nodes;

    Object.keys(otherTreeNodes).forEach((nodeId) => {
      // If the new node has been loaded, save that one
      if (
        nodeId in this.nodes &&
        !this.nodes[nodeId].isLoaded() &&
        otherTreeNodes[nodeId].isLoaded()
      )
        this.nodes[nodeId] = otherTreeNodes[nodeId];
      else if (!(nodeId in this.nodes))
        this.nodes[nodeId] = otherTreeNodes[nodeId];
    });
  }

  public containsNodes() {
    return Object.keys(this.nodes).length != 0;
  }

  public getRootNode() {
    for (const node of Object.values(this.nodes))
      if (node.isRootNode()) return node;
  }

  public getNodeById(nodeId: string): TreeNode {
    return this.nodes[nodeId];
  }
}
