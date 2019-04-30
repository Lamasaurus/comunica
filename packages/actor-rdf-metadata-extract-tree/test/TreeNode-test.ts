import { TreeNode } from "../";
import { TreeRelation } from "../lib/TreeRelation";

describe("TreeNode", () => {
  let node: TreeNode;

  beforeEach(() => {
    node = new TreeNode("id1");
  });

  it("should have an id", () => {
    expect(node.id).toEqual("id1");
  });

  it("should be possible to add a relation", () => {
    const relation: TreeRelation = new TreeRelation("rid", "id1", "id2", "TYPE");

    expect(node.isLeafNode()).toBe(true);

    node.addRelation(relation);
    expect(node.relations[0]).toEqual(relation);

    expect(node.isLeafNode()).toBe(false);
  });

  it("should be able to say if it is a root node", () => {
    expect(node.isRootNode()).toBe(true);
  });

  it("should be able to set a parent and identify as not a root node", () => {
    const parentNode = new TreeNode("id2");
    node.setParent(parentNode);

    expect(node.isRootNode()).toBe(false);
  });

  it("should exept a value", () => {
    node.setValue("value");
    expect(node.value).toEqual("value");
  });

  it("should say it is not loaded when members is not initialized", () => {
    expect(node.isLoaded()).toBe(false);
  });

  it("should say it is loaded when it has members", () => {
    const member1 = {
      graph: { value: "graph" },
      object: { value: "object" },
      predicate: { value: "predicate" },
      subject: { value: "subject" },
    };

    const member2 = {
      graph: { value: "graph2" },
      object: { value: "object2" },
      predicate: { value: "predicate2" },
      subject: { value: "subject2" },
    };

    expect(node.members).toEqual(undefined);
    node.addMembers([member1]);
    expect(node.members).toEqual([member1]);
    node.addMembers([member2]);
    expect(node.members).toEqual([member1, member2]);
  });

  it("should only give its members back once", () => {
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

    node.addMembers(members);

    expect(node.getMembersToPush()).toEqual(members);
    expect(node.getMembersToPush()).toEqual([]);
  });
});
