import {ActorRdfMetadata, IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * An RDF Metadata Actor that copies all quads in data and metadata
 * Only non-triple quad streams are supported.
 */
export class ActorRdfMetadataCopy extends ActorRdfMetadata {

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

      // Forward errors
      action.quads.on('error', (error) => {
        data.emit('error', error);
        metadata.emit('error', error);
      });

      const quads: RDF.Quad[] = [];
      action.quads.on('data', (quad) => {
        quads.push(quad)
      });

      // When the stream has finished,
      // determine the appropriate metadata graph,
      // and emit all quads to the appropriate streams.
      action.quads.on('end', () => {
        // End of stream
        quads.push(null);
        quads.forEach(quad => {
          data.push(quad);
          metadata.push(quad);
        });
      });
    };
    data._read = metadata._read = () => { attachListeners(); };

    return { data, metadata };
  }

}
