import { Tree, TreeNode, TreeRelation } from "../";
import { ActionContext } from "@comunica/core";

describe("TreeRelation", () => {
  const relation = new TreeRelation("id1", "id2", "id3", "https://w3id.org/tree#StringCompletesRelation");

  const node1 = new TreeNode("id2");
  node1.setValue("A");
  const node2 = new TreeNode("id3");
  node2.setValue("b");

  const tree = new Tree({ id2: node1, id3: node2 });

  it("should run relation implementation with no context", () => {
    expect(relation.isVisitable(tree, [], ActionContext({}))).toBe(true);
  });

  it("should run relation implementation with context", () => {
    expect(
      relation.isVisitable(tree, [], ActionContext({ "@comunica/actor-rdf-metadata-extract-tree:nameFilter": "A" })),
    ).toBe(true);
  });

  it("should not run relation implementation with context that does not include the current relation", () => {
    expect(
      relation.isVisitable(tree, [], ActionContext({ "@comunica/actor-rdf-metadata-extract-tree:nameFilter": "R" })),
    ).toBe(false);
  });
});
