import { Tree, TreeConstructor, TreeNode, TreeRelation } from "../";
import { Quad, BaseQuad } from "rdf-js";

describe("TreeConstructor", () => {
  const treeConstructor = new TreeConstructor();

  it("should add potential data", () => {
    const data1: any = {
      graph: { value: "graph" },
      object: { value: "object" },
      predicate: { value: "predicate" },
      subject: { value: "subject" },
    };

    const data2: any = {
      graph: { value: "graph" },
      object: { value: "object2" },
      predicate: { value: "predicate" },
      subject: { value: "object" },
    };

    treeConstructor.addPotentialData("subject", data1);
    expect(treeConstructor.potentialData).toEqual({
      subject: [data1],
    });

    treeConstructor.addPotentialData("subject", data2);
    expect(treeConstructor.potentialData).toEqual({
      subject: [data1, data2],
    });
  });

  it("should add members", () => {
    const blankNodeId = "subject";
    const nodeId = "nodeId";

    treeConstructor.addMember(nodeId, blankNodeId);
    expect(treeConstructor.treeMembers).toEqual({ nodeId: new Set([blankNodeId]) });
    treeConstructor.addMember(nodeId, blankNodeId);
    expect(treeConstructor.treeMembers).toEqual({ nodeId: new Set([blankNodeId]) });
  });

  it("should add a relation", () => {
    treeConstructor.addRelation("nodeId", "nodeId2");
    expect(treeConstructor.relations).toEqual({
      nodeId: [ "nodeId2" ],
    });
  });

  it("should add a relation type", () => {
    treeConstructor.addRelationType("blankNodeId", "relationType");
    expect(treeConstructor.relationTypes).toEqual({
      blankNodeId: "relationType",
    });
  });

  it("should add nodes to node map", () => {
    treeConstructor.addNodeToNodeMap("blankNodeId", "nodeId");
    expect(treeConstructor.nodeIdMap).toEqual({
      blankNodeId: "nodeId",
    });
  });

  it("should add nodes", () => {
    treeConstructor.addTreeNode("nodeId");
    treeConstructor.addTreeNode("nodeId2");
    treeConstructor.addTreeNode("nodeId2");

    expect(treeConstructor.nodes).toEqual({
      nodeId: new TreeNode("nodeId"),
      nodeId2: new TreeNode("nodeId2"),
    });
  });

  it("should not construct a tree when there are no nodes", () => {
    const treeConstructor2 = new TreeConstructor();
    expect(treeConstructor2.constructTree()).toBe(undefined);
  });

  it("should construct a tree if everything is supplied", () => {
    const tree = treeConstructor.constructTree();

    expect(tree).toBeInstanceOf(Tree);
  });
});
