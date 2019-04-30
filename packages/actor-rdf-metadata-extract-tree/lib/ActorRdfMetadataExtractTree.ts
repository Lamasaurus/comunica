import {
  ActorRdfMetadataExtract,
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
} from "@comunica/bus-rdf-metadata-extract";
import { IActorArgs, IActorTest } from "@comunica/core";
import { TreeConstructor } from "./TreeConstructor";

/**
 * An RDF Metadata Extract Actor that extracts total items counts from a metadata stream based on the given predicates.
 */
export class ActorRdfMetadataExtractTree extends ActorRdfMetadataExtract
  implements IActorRdfParseFixedMediaTypesArgs {
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
  public static readonly TYPE: string =
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public run(
    action: IActionRdfMetadataExtract,
  ): Promise<IActorRdfMetadataExtractOutput> {
    return new Promise((resolve, reject) => {
      const treeConstructor = new TreeConstructor();
      // Forward errors
      action.metadata.on("error", reject);

      action.metadata.on("data", (quad) => {
        if (
          quad.predicate.value === ActorRdfMetadataExtractTree.TYPE &&
          quad.object.value === "https://w3id.org/tree#Node"
        ) {
          const nodeId = quad.subject.value;
          treeConstructor.addTreeNode(nodeId);
        } else if (
          quad.predicate.value === "https://w3id.org/tree#hasChildRelation"
        ) {
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
        } else if (
          quad.predicate.value === ActorRdfMetadataExtractTree.TYPE &&
          ActorRdfMetadataExtractTree.RELATIONAL_TYPES.includes(
            quad.object.value,
          )
        ) {
          const blankNodeId = quad.subject.value;
          const relationType = quad.object.value;
          treeConstructor.addRelationType(blankNodeId, relationType);
        } else if (
          quad.predicate.value === "http://www.w3.org/ns/hydra/core#member"
        ) {
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
      action.metadata.on("end", () => {
        const tree = treeConstructor.constructTree();

        if (tree) {
          resolve({ metadata: { tree } });
        } else {
          resolve({ metadata: {} });
        }
      });
    });
  }
}

export interface IActorRdfParseFixedMediaTypesArgs
  extends IActorArgs<
    IActionRdfMetadataExtract,
    IActorTest,
    IActorRdfMetadataExtractOutput
  > {}