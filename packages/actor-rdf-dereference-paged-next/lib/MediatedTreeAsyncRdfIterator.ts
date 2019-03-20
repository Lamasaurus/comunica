import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import { Tree, TreeNode } from "@comunica/actor-rdf-metadata-extract-tree";
import * as RDF from "rdf-js";
import {TreeAsyncRdfIterator} from "./TreeAsyncRdfIterator";
import {Readable} from "stream";

export const KEY_CONTEXT_TREE: string = "@comunica/actor-rdf-dereference-page-next:tree";

/**
 * A PagedAsyncRdfIterator that pages based on a set of mediators.
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
  public readonly firstPageMetadata: () => Promise<{[id: string]: any}>;
  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  public readonly mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  public readonly mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
  public context: ActionContext;

  constructor(firstPageUrl: string, firstPageData: RDF.Stream, firstPageMetadata: () => Promise<{[id: string]: any}>,
    mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
    IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>,
    context: ActionContext) {
    super(firstPageUrl, { autoStart: false });
    this.firstPageData = firstPageData;
    this.firstPageMetadata = firstPageMetadata;
    this.mediatorRdfDereference = mediatorRdfDereference;
    this.mediatorMetadata = mediatorMetadata;
    this.mediatorMetadataExtract = mediatorMetadataExtract;
    this.context = context;

    this.context = this.context.set(KEY_CONTEXT_TREE, new Tree({}));
  }

  private combineTrees(newTree: Tree){
    const oldTree = this.context.get(KEY_CONTEXT_TREE);
    oldTree.combineWithTree(newTree);
    this.context = this.context.set(KEY_CONTEXT_TREE, oldTree)
    return oldTree;
  }

  protected async getIterator(url: string, nodeId: string, onNextPage: (nextPage: string) => void) {
    let pageData: Readable = new Readable({ objectMode: true });

    let tree: Tree;
    let node: TreeNode;

    // Get the node in the tree we are processing
    if (!nodeId){
      tree = this.combineTrees((await this.firstPageMetadata()).tree);
      node = tree.getRootNode();
    } else {
      const pageQuads: IActorRdfDereferenceOutput = await this.mediatorRdfDereference
        .mediate({ context: this.context, url });
      const pageMetaSplit: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
        { context: this.context, pageUrl: pageQuads.pageUrl, quads: pageQuads.quads, triples: pageQuads.triples });

      const metaData = await this.mediatorMetadataExtract
        .mediate({ context: this.context, pageUrl: pageQuads.pageUrl, metadata: pageMetaSplit.metadata });

      tree = this.combineTrees(metaData.metadata.tree);
      node = tree.nodes[nodeId];
    }


    // Look for the next node to load and push the data of the current node
    let next: string;
    let members: RDF.Quad[] = [];
    if (!node.isLoaded()) {
      next = node.id;
    } else {

      members = node.members;

      if(node.isLeafNode()){
        next = this.parentQueque.pop();
        node.visited = true;
      } else {
        let unvisitedNodes = node.relations.filter((relation) => !tree.nodes[relation.toNode].visited);

        if(unvisitedNodes.length > 0){
          this.parentQueque.push(nodeId);
          next = unvisitedNodes[0].toNode;
        }
        else {
          node.visited = true;
          next = this.parentQueque.pop();
        }
      }
    }

    const attachListeners = () => {
      pageData._read = () => { return; };
      members.forEach((member) => pageData.push(member));
      pageData.push(null);
    }
    pageData._read = () => { attachListeners() };

    onNextPage(next);
    return pageData;
  }
}
