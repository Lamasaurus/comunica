import {ActorRdfMetadataExtract, IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {IActorArgs, IActorTest} from "@comunica/core";

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

          if (treeConstructor.relations[par])
            treeConstructor.relations[par].push(child);
          else
            treeConstructor.relations[par] = [child];
        } else if (quad.predicate.value === "https://w3id.org/tree#child") {
          const nodeId = quad.object.value;
          const blankId = quad.subject.value;
          treeConstructor.nodeIdMap[blankId] = nodeId;
        } else if (quad.predicate.value === "https://w3id.org/tree#value") {
          const nodeId = quad.subject.value;
          const value = quad.object.value;
          treeConstructor.nodeValues[nodeId] = value;
        } else if (quad.predicate.value === ActorRdfMetadataExtractTree.TYPE && ActorRdfMetadataExtractTree.RELATIONAL_TYPES.includes(quad.object.value )) {
          const blankNodeId = quad.subject.value;
          const relationType = quad.object.value;
          treeConstructor.relationTypes[blankNodeId] = relationType;
        }
      });

      // Start constructing the tree
      action.metadata.on('end', () => {
        const tree = treeConstructor.constructTree();
        resolve({ metadata: { tree } });
      });
    });
  }

}

export interface IActorRdfParseFixedMediaTypesArgs
extends IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput> {
  predicates: string[];
}

class TreeConstructor {
  nodes: {[id: string]: TreeNode} = {};
  nodeValues: {[id: string]: any} = {};
  nodeIdMap: {[id: string]: string} = {};
  relations: {[id: string]: string[]} = {};
  relationTypes: {[id: string]: string} = {};

  public constructTree() {
    // Put all relations in place
    for (const fromNodeId in this.relations) {
      for (const blankNodeId of this.relations[fromNodeId]) {
        const fromNode = this.nodes[fromNodeId];
        const toNode = this.nodes[this.nodeIdMap[blankNodeId]];
        const relationType = this.relationTypes[blankNodeId]  
        const relation = new Relation(blankNodeId, fromNode, toNode, relationType);
        fromNode.addRelation(relation);
        toNode.setParent(fromNode);
      }
    }

    // Add values to the nodes
    for (const node of Object.keys(this.nodes))
      this.nodes[node].setValue(this.nodeValues[node]);

    return new Tree(this.nodes);
  }

  public addTreeNode(nodeId: string) {
    if (!(nodeId in this.nodes))
      this.nodes[nodeId] = new TreeNode(nodeId);
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
      if (nodeId in this.nodes && otherTreeNodes[nodeId].isLoaded())
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

  public getLeftMosteUnloadedNode(): TreeNode {
    let currentNode = this.loadingNode ? this.loadingNode : this.getRootNode();

    currentNode = currentNode.relations[0].toNode;
    // TODO

    return new TreeNode("");
  }

  public getNextNodeToLoad(currentNode: TreeNode): TreeNode {
    // TODO
    return new TreeNode("");
  }
}

export class TreeNode {
  id: string;
  relations: Relation[] = [];
  value: any;
  parentNode: TreeNode;
  isVisited: boolean = false;

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
    return !!this.relations;
  }

  // Returns true if the node is a root node, this is when it does not have a parent
  public isRootNode() {
    return !!this.parentNode;
  }
}

export class Relation {
  id: string;
  fromNode: TreeNode;
  toNode: TreeNode;
  relationType: string;

  constructor (id: string, fromNode: TreeNode, toNode: TreeNode, relationType: string) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.relationType = relationType;
  }
}
