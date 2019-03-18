import {ISearchForms} from "@comunica/actor-rdf-metadata-extract-hydra-controls";
import {ActorRdfResolveHypermedia, IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaOutput} from "@comunica/bus-rdf-resolve-hypermedia";
import {KEY_CONTEXT_SOURCE} from "@comunica/bus-rdf-resolve-quad-pattern";
import {KEY_CONTEXT_TREE} from "@comunica/actor-rdf-metadata-tree";
import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";
import {Tree, TreeNode} from "@comunica/actor-rdf-metadata-extract-tree";

/**
 * A comunica QPF RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveHypermediaTree extends ActorRdfResolveHypermedia
implements IActorRdfResolveHypermediaTreeArgs {

  public readonly subjectUri: string;
  public readonly predicateUri: string;
  public readonly objectUri: string;
  public readonly graphUri?: string;

  constructor(args: IActorRdfResolveHypermediaTreeArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveHypermedia): Promise<IActorTest> {
    debugger;
    if (!(action.context.get(KEY_CONTEXT_SOURCE).type === "hypermedia")) {
      throw new Error(this.name
        + ' requires a single source with a Hypermedia \'hypermedia\' entrypoint to be present in the context.');
    }

    const tree: Tree = action.context.get(KEY_CONTEXT_TREE);
    if (!tree || !tree.containsNodes()) {
      throw new Error(`${this.name} requires metadata and tree to work on.`);
    }

    return true;
  }

  /**
   * Look for the search form
   * @param {IActionRdfResolveHypermedia} the metadata to look for the form.
   * @return {Promise<IActorRdfResolveHypermediaOutput>} A promise resolving to a hypermedia form.
   */
  public async run(action: IActionRdfResolveHypermedia):
  Promise<IActorRdfResolveHypermediaOutput> {
    debugger;

    return {
      searchForm: {
        template: null,
        mappings: null,
        getUri: (entries: {[id: string]: string}): string => {
          /*
          const tree: Tree = action.context.get(KEY_CONTEXT_TREE);
          const nextNode: TreeNode = tree.getLeftMosteUnloadedNode();

          return nextNode.id;
           */
          return action.context.get(KEY_CONTEXT_SOURCE).value;
        }
      }
    }
  }
}

export interface IActorRdfResolveHypermediaTreeArgs extends
IActorArgs<IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput> {
}
