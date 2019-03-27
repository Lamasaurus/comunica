import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {ActorRdfDereferencePagedIterator, IActorRdfDereferencePagedIteratorOutput, IActionRdfDereferencePagedIterator} from "@comunica/bus-rdf-dereference-paged-iterator";
import * as RDF from "rdf-js";
import {MediatedPagedAsyncRdfIterator} from "./MediatedPagedAsyncRdfIterator";

/**
 * An RDF Dereference Paged Actor that dereferences hypermedia sources
 */
export class ActorRdfIteratorPagedNext extends ActorRdfDereferencePagedIterator {

  constructor(args: IActorRdfDereferencePagedIterator) {
    super(args);
  }

  public async test(action: IActionRdfDereferencePagedIterator): Promise<IActorTest> {
    if (!('next' in (await action.firstPageMetadata()))) {
      throw new Error("Needs 'next' link to work.");
    }

    return true;
  }

  public async run(action: IActionRdfDereferencePagedIterator): Promise<IActorRdfDereferencePagedIteratorOutput> {
    const iterator = new MediatedPagedAsyncRdfIterator(action.firstPageUrl, action.firstPageData, 
      action.firstPageMetadata, action.mediatorRdfDereference, action.mediatorMetadata,
      action.mediatorMetadataExtract, action.context);
    return { iterator };
  }
}

export interface IActorRdfDereferencePagedIterator extends
  IActorArgs<IActionRdfDereferencePagedIterator, IActorTest, IActorRdfDereferencePagedIteratorOutput> {}
