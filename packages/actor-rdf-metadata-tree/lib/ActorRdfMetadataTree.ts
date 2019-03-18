import {ActorRdfMetadata, IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {KEY_CONTEXT_SOURCE} from "@comunica/bus-rdf-resolve-quad-pattern";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {TreeConstructor, Tree, TreeNode, Relation} from "@comunica/actor-rdf-metadata-extract-tree";

export const KEY_CONTEXT_TREE: string = "comunica/actor-rdf-resolve-hypermedia-tree:tree";

/**
 * An RDF Metadata Actor that copies all quads in data and metadata
 * Only non-triple quad streams are supported.
 */
export class ActorRdfMetadataTree extends ActorRdfMetadata {

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

  constructor(args: IActorArgs<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadata): Promise<IActorTest> {
    if (action.triples) {
      throw new Error('This actor only supports non-triple quad streams.');
    }
    return true;
  }

  public async run(action: IActionRdfMetadata): Promise<IActorRdfMetadataOutput> {
    const data: Readable = new Readable({ objectMode: true });
    const metadata: Readable = new Readable({ objectMode: true });

    // Delay attachment of listeners until the metadata stream is being read.
    const attachListeners = () => {
      // Attach listeners only once
      data._read = metadata._read = () => { return; };
      const treeConstructor = new TreeConstructor();

      // Forward errors
      action.quads.on('error', (error) => {
        data.emit('error', error);
        metadata.emit('error', error);
      });

      const metadataQuads: RDF.Quad[] = [];
      action.quads.on('data', (quad) => {
        let isData = false;

        if (quad.predicate.value === ActorRdfMetadataTree.TYPE && quad.object.value === "https://w3id.org/tree#Node") {
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
        } else if (quad.predicate.value === ActorRdfMetadataTree.TYPE && ActorRdfMetadataTree.RELATIONAL_TYPES.includes(quad.object.value )) {
          const blankNodeId = quad.subject.value;
          const relationType = quad.object.value;
          treeConstructor.relationTypes[blankNodeId] = relationType;
        } else if (quad.predicate.value === "http://www.w3.org/ns/hydra/core#member") {
          const nodeId = quad.subject.value;
          if (nodeId in treeConstructor.treeMembers)
            treeConstructor.treeMembers[nodeId].push(quad.object.value);
          else
            treeConstructor.treeMembers[nodeId] = [quad.object.value];
        } else {
          const subject = quad.subject.value;
          if (subject in treeConstructor.potentialData)
            treeConstructor.potentialData[subject].push(quad);
          else
            treeConstructor.potentialData[subject] = [quad];

          isData = true;

        }

        if (!isData) {
          metadataQuads.push(quad);
        }
      });

      // When the stream has finished, emit all quads to the data and metadata streams.
      action.quads.on('end', () => {
        debugger;
        const newTree: Tree = treeConstructor.constructTree();

        // Get the old tree
        if (!action.context.get(KEY_CONTEXT_TREE))
          action.context = action.context.set(KEY_CONTEXT_TREE, new Tree({})); 
        const tree: Tree = action.context.get(KEY_CONTEXT_TREE);

        // Get the new tree and combine it with the old one
        tree.combineWithTree(newTree);

        // Set the tree in the context
        action.context = action.context.set(KEY_CONTEXT_TREE, tree);

        const baseURI = action.context.get(KEY_CONTEXT_SOURCE).value;
        const dataMembers = tree.nodes[baseURI].members;

        // End of stream
        dataMembers.forEach(quad => {
          data.push(quad);
        });
        data.push(null);

        metadataQuads.forEach(quad => {
          metadata.push(quad);
        })
        metadata.push(null);
      });
    };
    data._read = metadata._read = () => { attachListeners(); };

    return { data, metadata };
  }

}
