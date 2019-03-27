import {ActorRdfMetadataExtract, IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";


/**
 * An RDF Metadata Extract Actor that extracts total items counts from a metadata stream based on the given predicates.
 */
export class ActorRdfMetadataExtractTree extends ActorRdfMetadataExtract implements IActorRdfParseFixedMediaTypesArgs {

  public readonly predicates: string[];
  public static readonly RELATIONAL_TYPES: string[] = [
    "https://w3id.org/tree#StringCompletesRelation",
    "https://w3id.org/tree#GreaterThanRelation",
    "https://w3id.org/tree#GreaterOrEqualThanRelation",
    "https://w3id.org/tree#LesserThanRelation",
    "https://w3id.org/tree#LesserOrEqualThanRelation",
    "https://w3id.org/tree#EqualThanRelation",
    "https://w3id.org/tree#GeospatiallyContainsRelation",
    "https://w3id.org/tree#InBetweenRelation",
  ];
  public static readonly TYPE: string = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    return new Promise((resolve, reject) => {
      const treeConstructor = new TreeConstructor();
      // Forward errors
      action.metadata.on('error', reject);

      action.metadata.on('data', (quad) => {
        if (quad.predicate.value === ActorRdfMetadataExtractTree.TYPE && quad.object.value === "https://w3id.org/tree#Node") {
          const nodeId = quad.subject.value;
          treeConstructor.addTreeNode(nodeId);

        } else if (quad.predicate.value === "https://w3id.org/tree#hasChildRelation") {
          const par = quad.subject.value;
          const child = quad.object.value;
          treeConstructor.addRelation(par, child);

        } else if (quad.predicate.value === "https://w3id.org/tree#child") {
          const nodeId = quad.object.value;
          const blankId = quad.subject.value;
          treeConstructor.addNodeToNodeMap(blankId, nodeId);

        } else if (quad.predicate.value === "https://w3id.org/tree#value") {
          const nodeId = quad.subject.value;
          const value = quad.object.value;
          treeConstructor.nodeValues[nodeId] = value;

        } else if (quad.predicate.value === ActorRdfMetadataExtractTree.TYPE && ActorRdfMetadataExtractTree.RELATIONAL_TYPES.includes(quad.object.value )) {
          const blankNodeId = quad.subject.value;
          const relationType = quad.object.value;
          treeConstructor.addRelationType(blankNodeId, relationType);

        } else if (quad.predicate.value === "http://www.w3.org/ns/hydra/core#member") {
          const nodeId = quad.subject.value;
          const blankNodeId = quad.object.value;
          treeConstructor.addMember(nodeId, blankNodeId);

        } else {
          // Some data is not directly a member
          const subject = quad.subject.value;
          treeConstructor.addPotentialData(subject, quad);
        }
      });

      // Start constructing the tree
      action.metadata.on('end', () => {
        const tree = treeConstructor.constructTree();

        if (tree)
          resolve({ metadata: { tree } });
        else
          resolve({ metadata: {} });
      });
    });
  }

}

export interface IActorRdfParseFixedMediaTypesArgs
extends IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput> {
  predicates: string[];
}

export class TreeConstructor {
  nodes: {[id: string]: TreeNode} = {};
  nodeValues: {[id: string]: any} = {};
  nodeIdMap: {[id: string]: string} = {};
  relations: {[id: string]: string[]} = {};
  relationTypes: {[id: string]: string} = {};
  treeMembers: {[id: string]: string[]} = {};
  potentialData: {[id: string]: any[]} = {};

  public constructTree() {
    if (Object.keys(this.nodes).length == 0)
      return; 

    // Put all relations in place
    for (const fromNodeId in this.relations) {
      for (const blankNodeId of this.relations[fromNodeId]) {
        const toNodeId = this.nodeIdMap[blankNodeId];
        const relationType = this.relationTypes[blankNodeId]  
        const relation = new Relation(blankNodeId, fromNodeId, toNodeId, relationType);
        this.nodes[fromNodeId].addRelation(relation);
      }
    }

    // Add the members to the nodes
    for (const nodeId in this.treeMembers)
      for (const member of this.treeMembers[nodeId])
        this.nodes[nodeId].addMembers(this.loadData(member));

    // Add values to the nodes
    for (const node of Object.keys(this.nodes))
      this.nodes[node].setValue(this.nodeValues[node]);

    return new Tree(this.nodes);
  }

  public addPotentialData(subject: string, quad: RDF.Quad) {
    this.addToDictList(this.potentialData, subject, quad);
  }

  public addMember(nodeId: string, blankNodeId: string) {
    this.addToDictList(this.treeMembers, nodeId, blankNodeId);
  }

  public addRelation(par: string, child: string) {
    this.addToDictList(this.relations, par, child);
  }

  private addToDictList(list: any, key: any, value: any) {
    if (list[key])
      list[key].push(value);
    else
      list[key] = [value];
  }

  public addNodeToNodeMap(blankNodeId: string, nodeId: string) {
    this.nodeIdMap[blankNodeId] = nodeId;
  }

  public addRelationType(blankNodeId: string, relationType: string) {
    this.relationTypes[blankNodeId] = relationType;
  }

  public addTreeNode(nodeId: string) {
    if (!(nodeId in this.nodes))
      this.nodes[nodeId] = new TreeNode(nodeId);
  }

  private loadData(subjectId: string): any[] {
    const data = subjectId in this.potentialData ? this.potentialData[subjectId] : [];
    // Make a copy of the list
    let returnData = [].concat(data);

    // Look recursively for other quads that belong to members
    for (const quad of data)
      returnData = returnData.concat(this.loadData(quad.object.value));

    return returnData;
  }
}

export class Tree {
  nodes: {[id: string]: TreeNode} = {};
  loadingNode: TreeNode;

  constructor(nodes: {[id: string]: TreeNode}) {
    this.nodes = nodes;
  }

  public combineWithTree(tree: Tree) {
    const otherTreeNodes = tree.nodes;

    Object.keys(otherTreeNodes).forEach((nodeId) => {
      // If the new node has been loaded, save that one
      if (nodeId in this.nodes && !this.nodes[nodeId].isLoaded() && otherTreeNodes[nodeId].isLoaded())
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
      if (node.isRootNode())
        return node;
  }

  public getNodeById(nodeId: string): TreeNode {
    return this.nodes[nodeId];
  }
}

export class TreeNode {
  id: string;
  relations: Relation[] = [];
  value: any;
  parentNode: TreeNode;
  members: any[];
  isVisited: boolean = false;
  membersPushed: boolean = false;

  public constructor(id: string) {
    this.id = id;
  }

  public addRelation(relation: Relation) {
    this.relations.push(relation);
  }

  public setParent(parentNode: TreeNode) {
    this.parentNode = parentNode;
  }

  public setValue(value: any){
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
    if (!this.members)
      this.members = [];

    this.members = this.members.concat(members);
  }
}

export class Relation {
  id: string;
  fromNode: string;
  toNode: string;
  relationType: string;

  constructor (id: string, fromNode: string, toNode: string, relationType: string) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.relationType = relationType;
  }
}
