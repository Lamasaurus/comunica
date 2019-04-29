import { ActionContext } from "@comunica/core";
import { Tree } from "./Tree";
import { TreeNode } from "./TreeNode";

export const KEY_TREE_RELATION_STRING =
  "@comunica/actor-rdf-metadata-extract-tree:nameFilter";

const RELATIONAL_IMPLEMENTATIONS: {
  [id: string]: (
    context: ActionContext,
    parent: TreeNode,
    child: TreeNode,
    valueStack: any[],
  ) => boolean;
} = {
  "https://w3id.org/tree#StringCompletesRelation": (
    context,
    parent,
    child,
    valueStack,
  ) => {
    // Concat all earlier values, the value of the parent and of the child
    // then only take the string values and join them to one string
    const valueString = [...valueStack, parent.value, child.value]
      .filter((value) => typeof value === "string")
      .join("");

    const filterValue = context.get(KEY_TREE_RELATION_STRING, "");

    // Check if the valueString is the start of the filterValue or visaversa
    return (
      filterValue.startsWith(valueString) || valueString.startsWith(filterValue)
    );
  },
};

export class TreeRelation {
  public id: string;
  public fromNode: string;
  public toNode: string;
  public relationType: string;

  constructor(
    id: string,
    fromNode: string,
    toNode: string,
    relationType: string,
  ) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.relationType = relationType;
  }

  public isVisitable(
    tree: Tree,
    valueStack: any[],
    context: ActionContext,
  ): boolean {
    return RELATIONAL_IMPLEMENTATIONS[this.relationType](
      context,
      tree.getNodeById(this.fromNode),
      tree.getNodeById(this.toNode),
      valueStack,
    );
  }
}
