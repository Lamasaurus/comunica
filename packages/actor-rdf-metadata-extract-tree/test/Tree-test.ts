import { Tree, TreeNode } from "../";

describe("TreeRelation", () => {
  const node1 = new TreeNode("id2");
  node1.setValue("A");
  const node2 = new TreeNode("id3");
  node2.setValue("b");

  node2.setParent(node1);

  const tree = new Tree({ id2: node1, id3: node2 });

  it("should know it contains nodes", () => {
    expect(tree.containsNodes()).toBe(true);
  });

  it("should know it does not contains nodes", () => {
    const tree2 = new Tree({});
    expect(tree2.containsNodes()).toBe(false);
  });

  it("should find the root node", () => {
    expect(tree.getRootNode()).toEqual(node1);
  });

  it("should not find the root node if there are no nodes", () => {
    const tree2 = new Tree({});
    expect(tree2.getRootNode()).toEqual(undefined);
  });

  it("should be able to find a node by id", () => {
    expect(tree.getNodeById("id2")).toEqual(node1);
    expect(tree.getNodeById("id4")).toBe(undefined);
  });

  it("should be able to combine trees", () => {
    const members = [
      {
        graph: { value: "graph" },
        object: { value: "object" },
        predicate: { value: "predicate" },
        subject: { value: "subject" },
      },

      {
        graph: { value: "graph2" },
        object: { value: "object2" },
        predicate: { value: "predicate2" },
        subject: { value: "subject2" },
      },
    ];
    const loadedNode2 = new TreeNode("id3");
    loadedNode2.addMembers(members)
    const node3 = new TreeNode("id4");
    const otherTree = new Tree({ "id3": loadedNode2, "id4": node3 });

    tree.combineWithTree(otherTree);

    expect(tree.getNodeById("id3").isLoaded()).toBe(true);
    expect(tree.getNodeById("id4")).toBeTruthy();
  });
});
