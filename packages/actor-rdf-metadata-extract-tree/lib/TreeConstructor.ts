import * as RDF from "rdf-js";
import { Tree } from "./Tree";
import { TreeNode } from "./TreeNode";
import { TreeRelation } from "./TreeRelation";

export class TreeConstructor {
  public nodeValues: { [id: string]: any } = {};
  private nodes: { [id: string]: TreeNode } = {};
  private nodeIdMap: { [id: string]: string } = {};
  private relations: { [id: string]: string[] } = {};
  private relationTypes: { [id: string]: string } = {};
  private treeMembers: { [id: string]: Set<string> } = {};
  private potentialData: { [id: string]: any[] } = {};

  public constructTree() {
    if (Object.keys(this.nodes).length == 0) return;

    // Put all relations in place
    for (const fromNodeId in this.relations) {
      for (const blankNodeId of this.relations[fromNodeId]) {
        const toNodeId = this.nodeIdMap[blankNodeId];
        const relationType = this.relationTypes[blankNodeId];
        const relation = new TreeRelation(
          blankNodeId,
          fromNodeId,
          toNodeId,
          relationType,
        );
        this.nodes[fromNodeId].addRelation(relation);
      }
    }

    // Add the members to the nodes
    for (const nodeId in this.treeMembers) {
      for (const member of this.treeMembers[nodeId]) {
        this.nodes[nodeId].addMembers(this.loadData(member));
      }
    }

    // Add values to the nodes
    for (const node of Object.keys(this.nodes)) {
      this.nodes[node].setValue(this.nodeValues[node]);
    }

    return new Tree(this.nodes);
  }

  public addPotentialData(subject: string, quad: RDF.Quad) {
    this.addToDictList(this.potentialData, subject, quad);
  }

  public addMember(nodeId: string, blankNodeId: string) {
    if (this.treeMembers[nodeId])
      this.treeMembers[nodeId].add(blankNodeId);
    else
      this.treeMembers[nodeId] = new Set([blankNodeId]);
  }

  public addRelation(par: string, child: string) {
    this.addToDictList(this.relations, par, child);
  }

  public addNodeToNodeMap(blankNodeId: string, nodeId: string) {
    this.nodeIdMap[blankNodeId] = nodeId;
  }

  public addRelationType(blankNodeId: string, relationType: string) {
    this.relationTypes[blankNodeId] = relationType;
  }

  public addTreeNode(nodeId: string) {
    if (!(nodeId in this.nodes)) this.nodes[nodeId] = new TreeNode(nodeId);
  }

  private loadData(subjectId: string): any[] {
    const data =
      subjectId in this.potentialData ? this.potentialData[subjectId] : [];
    // Make a copy of the list
    let returnData = [].concat(data);

    // Look recursively for other quads that belong to members
    for (const quad of data)
      returnData = returnData.concat(this.loadData(quad.object.value));

    return returnData;
  }

  private addToDictList(list: any, key: any, value: any) {
    if (list[key]) list[key].push(value);
    else list[key] = [value];
  }
}
