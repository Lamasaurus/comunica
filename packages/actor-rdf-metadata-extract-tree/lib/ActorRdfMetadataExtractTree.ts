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

      // Immediately resolve when a value has been found.
      action.metadata.on('data', (quad) => {
        if (quad.predicate.value === ActorRdfMetadataExtractTree.TYPE && quad.object.value === "https://w3id.org/tree#Node") {
          const nodeId = quad.subject.value;
          treeConstructor.nodes[nodeId] = new Node(nodeId);
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

      // If no value has been found, assume infinity.
      action.metadata.on('end', () => {
        debugger;
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
  nodes: {[id: string]: Node} = {};
  nodeValues: {[id: string]: any} = {};
  nodeIdMap: {[id: string]: string} = {};
  relations: {[id: string]: string[]} = {};
  relationTypes: {[id: string]: string} = {};

  public constructTree() {
    debugger;
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

    return this.nodes;
  }
}

export class Node {
  id: string;
  relations: Relation[] = [];
  value: any;
  parentNode: Node;

  public constructor(id: string) {
    this.id = id;
  }

  public addRelation(relation: Relation) {
    this.relations.push(relation);
  }

  public setParent(parentNode: Node) {
    this.parentNode = parentNode;
  }

  public setValue(value: any){
    this.value = value;
  }
}

export class Relation {
  id: string;
  fromNode: Node;
  toNode: Node;
  relationType: string;

  constructor (id: string, fromNode: Node, toNode: Node, relationType: string) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.relationType = relationType;
  }
}
