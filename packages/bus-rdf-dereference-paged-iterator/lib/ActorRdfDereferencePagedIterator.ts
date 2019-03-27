import {Actor, IAction, IActorArgs, IActorOutput, IActorTest, Mediator} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {ActorRdfDereferencePaged, IActionRdfDereferencePaged,
  IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";

/**
 * A base actor for dereferencing URLs to quad streams and following pages.
 *
 * Actor types:
 * * Input:  IActionRdfDereferencePagedIterator:      A URL.
 * * Test:   <none>
 * * Output: IActorRdfDereferencePagedIteratorOutput: A quad data and optional metadata stream
 *
 * @see IActionRdfDereference
 * @see IActorRdfDereferenceOutput
 */
export abstract class ActorRdfDereferencePagedIterator
extends Actor<IActionRdfDereferencePagedIterator, IActorTest, IActorRdfDereferencePagedIteratorOutput> {

  constructor(args: IActorArgs<IActionRdfDereferencePagedIterator, IActorTest, IActorRdfDereferencePagedIteratorOutput>) {
    super(args);
  }

}

export interface IActionRdfDereferencePagedIterator extends IAction {
  firstPageUrl: string;
  firstPageData: RDF.Stream;
  firstPageMetadata: () => Promise<{[id: string]: any}>;
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>, IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,  IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
}

export interface IActorRdfDereferencePagedIteratorOutput extends IActorOutput {
  /**
   * The resulting quad data stream over all pages.
   */
  iterator: AsyncIterator<RDF.Quad> & RDF.Stream;
}
