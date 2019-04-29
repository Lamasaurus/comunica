import { Tree, TreeNode } from "@comunica/actor-rdf-metadata-extract-tree";
import {
  IActionRdfDereference,
  IActorRdfDereferenceOutput,
} from "@comunica/bus-rdf-dereference";
import {
  IActionRdfMetadata,
  IActorRdfMetadataOutput,
} from "@comunica/bus-rdf-metadata";
import {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
} from "@comunica/bus-rdf-metadata-extract";
import { ActionContext, Actor, IActorTest, Mediator } from "@comunica/core";
import * as RDF from "rdf-js";
import { Readable } from "stream";
import { TreeAsyncRdfIterator } from "./TreeAsyncRdfIterator";

export const KEY_CONTEXT_TREE: string =
  "@comunica/actor-rdf-dereference-page-next:tree";
export const KEY_CONTEXT_PARENT_QUEUE: string =
  "@comunica/actor-rdf-dereference-page-next:parentQueue";
export const KEY_CONTEXT_VALUE_STACK: string =
  "@comunica/actor-rdf-dereference-page-next:valueStack";

/**
 * A TreeAsyncRdfIterator that pages based on a set of mediators.
 *
 * It expects the first page to be already processed partially.
 * Based on the data stream of the first page, and a promise to the metadata of the first page,
 * it will emit data elements from this page and all following pages using the 'next' metadata link.
 *
 * `mediatorRdfDereference` is used to dereference the 'next' link to a quad stream.
 * `mediatorMetadata` is used to split this quad stream into a data and metadata stream.
 * `mediatorMetadataExtract` is used to collect the metadata object from this metadata stream,
 * possibly containing another 'next' link.
 */
export class MediatedTreeAsyncRdfIterator extends TreeAsyncRdfIterator {
  public readonly firstPageData: RDF.Stream;
  public readonly firstPageMetadata: () => Promise<{ [id: string]: any }>;
  public readonly mediatorRdfDereference: Mediator<
    Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference,
    IActorTest,
    IActorRdfDereferenceOutput
  >;
  public readonly mediatorMetadata: Mediator<
    Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata,
    IActorTest,
    IActorRdfMetadataOutput
  >;
  public readonly mediatorMetadataExtract: Mediator<
    Actor<
      IActionRdfMetadataExtract,
      IActorTest,
      IActorRdfMetadataExtractOutput
    >,
    IActionRdfMetadataExtract,
    IActorTest,
    IActorRdfMetadataExtractOutput
  >;
  public context: ActionContext;

  constructor(
    firstPageUrl: string,
    firstPageData: RDF.Stream,
    firstPageMetadata: () => Promise<{ [id: string]: any }>,
    mediatorRdfDereference: Mediator<
      Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
      IActionRdfDereference,
      IActorTest,
      IActorRdfDereferenceOutput
    >,
    mediatorMetadata: Mediator<
      Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
      IActionRdfMetadata,
      IActorTest,
      IActorRdfMetadataOutput
    >,
    mediatorMetadataExtract: Mediator<
      Actor<
        IActionRdfMetadataExtract,
        IActorTest,
        IActorRdfMetadataExtractOutput
      >,
      IActionRdfMetadataExtract,
      IActorTest,
      IActorRdfMetadataExtractOutput
    >,
    context: ActionContext,
  ) {
    super(firstPageUrl, { autoStart: false });
    this.firstPageData = firstPageData;
    this.firstPageMetadata = firstPageMetadata;
    this.mediatorRdfDereference = mediatorRdfDereference;
    this.mediatorMetadata = mediatorMetadata;
    this.mediatorMetadataExtract = mediatorMetadataExtract;
    this.context = context;

    this.context = this.context.set(KEY_CONTEXT_TREE, new Tree({}));
  }

  protected async getIterator(
    url: string,
    nodeId: string,
    onNextPage: (nextPage: string) => void,
  ) {
    const { tree, node } = await this.getTree(nodeId, url);
    const parentQueue = this.context.get(KEY_CONTEXT_PARENT_QUEUE, []);
    const valueStack = this.context.get(KEY_CONTEXT_VALUE_STACK, []);

    // Look for the next node to load and push the data of the current node
    let next: string;
    let members: RDF.Quad[] = [];

    if (!node.isLoaded()) {
      // If the current node is not loaded, load it next
      next = node.id;
    } else {
      // Get the data members that can be returned for the query
      members = node.getMembersToPush();

      // Get all unvisited nodes that are reachable from this one
      const unvisitedNodes = node.relations.filter(
        (relation) =>
          relation.isVisitable(tree, valueStack, this.context) &&
          !tree.getNodeById(relation.toNode).isVisited,
      );

      if (unvisitedNodes.length > 0) {
        // If the node has unvisited children
        // Take the next unvisited child and push this node on the parent queue
        next = unvisitedNodes[0].toNode;
        parentQueue.push(nodeId);
        valueStack.push(node.value);
      } else {
        // If the node is a leaf or has no more unvisited children
        // The next node to process is the parent of this node
        next = parentQueue.pop();
        node.isVisited = true;
        valueStack.pop();
      }
    }

    this.context = this.context.set(KEY_CONTEXT_PARENT_QUEUE, parentQueue);
    this.context = this.context.set(KEY_CONTEXT_VALUE_STACK, valueStack);

    onNextPage(next);
    return this.createReadableStream(members);
  }

  private createReadableStream(members: any): Readable {
    const pageData: Readable = new Readable({ objectMode: true });

    // Create a lazy listener
    const attachListeners = () => {
      pageData._read = () => {
        return;
      };

      members.forEach((member: any) => pageData.push(member));
      pageData.push(null);
    };

    pageData._read = () => {
      attachListeners();
    };

    return pageData;
  }

  private async getTree(
    nodeId: string,
    url: string,
  ): Promise<{ tree: Tree; node: TreeNode }> {
    let tree: Tree;
    let node: TreeNode;

    // Get the node in the tree we are processing
    if (!nodeId) {
      // If this is the first time the iterator is invoked
      tree = this.combineTrees((await this.firstPageMetadata()).tree);
      node = tree.getRootNode();
    } else {
      // If the tree needs to be combined with the next part
      const pageQuads: IActorRdfDereferenceOutput = await this.mediatorRdfDereference.mediate(
        { context: this.context, url },
      );
      const pageMetaSplit: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
        {
          context: this.context,
          pageUrl: pageQuads.pageUrl,
          quads: pageQuads.quads,
          triples: pageQuads.triples,
        },
      );

      const metaData = await this.mediatorMetadataExtract.mediate({
        context: this.context,
        metadata: pageMetaSplit.metadata,
        pageUrl: pageQuads.pageUrl,
      });

      tree = this.combineTrees(metaData.metadata.tree);
      node = tree.getNodeById(nodeId);
    }

    return { tree, node };
  }

  private combineTrees(newTree: Tree) {
    const oldTree = this.context.get(KEY_CONTEXT_TREE);
    oldTree.combineWithTree(newTree);
    this.context = this.context.set(KEY_CONTEXT_TREE, oldTree);
    return oldTree;
  }
}
