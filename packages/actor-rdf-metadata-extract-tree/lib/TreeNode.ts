import * as RDF from "rdf-js";
import { TreeRelation } from "./TreeRelation";

export class TreeNode {
  public id: string;
  public value: any;
  public isVisited: boolean = false;
  public members: RDF.Quad[];
  public relations: TreeRelation[] = [];
  private parentNode: TreeNode;
  private membersPushed: boolean = false;

  public constructor(id: string) {
    this.id = id;
  }

  public addRelation(relation: TreeRelation) {
    this.relations.push(relation);
  }

  public setParent(parentNode: TreeNode) {
    this.parentNode = parentNode;
  }

  public setValue(value: any) {
    this.value = value;
  }

  // All a nodes relations are defined in one fragment, so when a node has relations it is loaded
  public isLoaded() {
    return !!this.members;
  }

  // Returns true if the node is a root node, this is when it does not have a parent
  public isRootNode() {
    return !this.parentNode;
  }

  public isLeafNode() {
    return this.relations.length == 0;
  }

  public addMembers(members: any[]) {
    if (!this.members) this.members = [];

    this.members = this.members.concat(members);
  }

  public getMembersToPush(): RDF.Quad[] {
    if (!this.membersPushed) {
      this.membersPushed = true;
      return this.members;
    }

    return [];
  }
}
