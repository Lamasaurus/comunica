import {
  ActorRdfDereferencePagedIterator,
  IActionRdfDereferencePagedIterator,
  IActorRdfDereferencePagedIteratorOutput,
} from "@comunica/bus-rdf-dereference-paged-iterator";
import { IActorArgs, IActorTest } from "@comunica/core";
import { MediatedTreeAsyncRdfIterator } from "./MediatedTreeAsyncRdfIterator";

/**
 * An RDF Dereference Paged Actor that dereferences hypermedia sources
 */
export class ActorRdfIteratorTree extends ActorRdfDereferencePagedIterator {
  constructor(args: IActorRdfDereferencePagedIterator) {
    super(args);
  }

  public async test(
    action: IActionRdfDereferencePagedIterator,
  ): Promise<IActorTest> {
    if (!("tree" in (await action.firstPageMetadata()))) {
      throw new Error("Needs hypermedia 'tree' to work on.");
    }

    return true;
  }

  public async run(
    action: IActionRdfDereferencePagedIterator,
  ): Promise<IActorRdfDereferencePagedIteratorOutput> {
    const iterator = new MediatedTreeAsyncRdfIterator(
      action.firstPageUrl,
      action.firstPageData,
      action.firstPageMetadata,
      action.mediatorRdfDereference,
      action.mediatorMetadata,
      action.mediatorMetadataExtract,
      action.context,
    );
    return { iterator };
  }
}

export interface IActorRdfDereferencePagedIterator
  extends IActorArgs<
    IActionRdfDereferencePagedIterator,
    IActorTest,
    IActorRdfDereferencePagedIteratorOutput
  > {}
