import { BufferedIterator, BufferedIteratorOptions } from "asynciterator";
import * as RDF from "rdf-js";

/**
 * An abstract quad iterator that iterates over several pages represented as a tree.
 */
export abstract class TreeAsyncRdfIterator extends BufferedIterator<RDF.Quad>
  implements RDF.Stream {

  private readonly startUrl: string;
  private nextUrl: string;
  private node: string;

  constructor(startUrl: string, options?: BufferedIteratorOptions) {
    super(options);
    this.startUrl = startUrl;
    this.nextUrl = startUrl;
  }

  public _read(count: number, done: () => void) {
    if (this.nextUrl) {
      this.startIterator(this.nextUrl, this.node)
        .then(done)
        .catch(e => this.emit("error", e));
    } else {
      done();
    }
  }

  /**
   * Create a new iterator for the given url, with the given node id.
   * @param {string} url The URL for which a quad iterator shuld be created.
   * @param {nodeId} the node id of the root node.
   * @param {(nextPage: string) => void} onNextPage A callback for when the next page url has been determined.
   *                                                This may be falsy if the last page was found
   * @return {Promise<RDF.Stream>} A promise that resolves to the quad data stream for the given page.
   */
  protected abstract getIterator(
    url: string,
    nodeId: string,
    onNextPage: (nextPage?: string) => void
  ): Promise<RDF.Stream>;

  /**
   * Start an iterator for the given node and inherit all its data elements and error event.
   * @param {string} url The URL for which a quad iterator should be created.
   * @param {node} the id of the root node.
   * @return {Promise<any>} A promise that resolves when a new iterator was started (but not necessarily ended).
   */
  protected async startIterator(url: string, node: string): Promise<any> {
    this.nextUrl = null;
    let ended: boolean = false;
    let shouldClose: boolean = false;
    const it: RDF.Stream = await this.getIterator(
      url,
      node,
      (nextPage?: string) => {
        if (nextPage) {
          this.nextUrl = nextPage;
          this.node = nextPage;
          this.readable = true;
        } else {
          if (!ended) {
            shouldClose = true;
          } else {
            this.close();
          }
        }
      }
    );

    it.on("data", (quad: RDF.Quad) => {
      this._push(quad);
      this.readable = true;
    });

    it.on("error", (e: Error) => this.emit("error", e));

    it.on("end", () => {
      ended = true;
      if (shouldClose) {
        this.close();
      }
    });
  }
}