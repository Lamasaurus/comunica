import {ActorRdfDereferencePaged} from "@comunica/bus-rdf-dereference-paged";
import {Bus} from "@comunica/core";
import {ClonedIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorRdfDereferencePagedHypermedia} from "../lib/ActorRdfDereferencePagedHypermedia";
const CombinedStream = require("combined-stream");
const stream = require('streamify-array');
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfDereferencePagedHypermedia', () => {
  let bus;
  let mediator;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediator = {};
  });

  describe('The ActorRdfDereferencePagedHypermedia module', () => {
    it('should be a function', () => {
      expect(ActorRdfDereferencePagedHypermedia).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfDereferencePagedHypermedia constructor', () => {
      expect(new (<any> ActorRdfDereferencePagedHypermedia)({
        bus,
        mediatorMetadata: mediator,
        mediatorMetadataExtract: mediator,
        mediatorRdfDereference: mediator,
        mediatorDereferencePagedIterator: mediator,
        name: 'actor',
      })).toBeInstanceOf(ActorRdfDereferencePagedHypermedia);
      expect(new (<any> ActorRdfDereferencePagedHypermedia)({
        bus,
        mediatorMetadata: mediator,
        mediatorMetadataExtract: mediator,
        mediatorRdfDereference: mediator,
        mediatorDereferencePagedIterator: mediator,
        name: 'actor',
      })).toBeInstanceOf(ActorRdfDereferencePaged);
    });

    it('should not be able to create new ActorRdfDereferencePagedHypermedia objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfDereferencePagedHypermedia)(); }).toThrow();
    });
  });

  describe('An ActorRdfDereferencePagedHypermedia instance', () => {
    let actor: ActorRdfDereferencePagedHypermedia;
    let actorCached: ActorRdfDereferencePagedHypermedia;
    let mediatorMetadata;
    let mediatorMetadataExtract;
    let mediatorRdfDereference;
    let mediatorDereferencePagedIterator;
    let stream0;
    let stream1;
    let stream2;
    let cacheSize;

    beforeEach(() => {
      stream0 = stream([ '0a', '0b', '0c' ]);
      stream1 = stream([ '1a', '1b', '1c' ]);
      stream2 = stream([ '2a', '2b', '2c' ]);

      mediatorMetadata = { mediate: (action) => Promise.resolve(
        { data: action.quads.data, metadata: action.quads.metadata }) };
      mediatorMetadataExtract = { mediate: (action) => Promise.resolve({ metadata: action.metadata }) };
      mediatorRdfDereference = {
        mediate: (action) => {
          switch (action.url) {
            case 'http://example.org/':
              return Promise.resolve(
                { pageUrl: '0', quads: { data: stream0,
                  metadata: { next: 'http://example.org/1' }}, triples: true});
            case 'http://example.org/1':
              return Promise.resolve(
                { pageUrl: '1', quads: { data: stream1,
                  metadata: { next: 'http://example.org/2' }}, triples: true});
            case 'http://example.org/2':
              return Promise.resolve(
                { pageUrl: '2', quads: { data: stream2,
                  metadata: { next: null }}, triples: true});
            default:
              return Promise.reject(new Error('Invalid paged-next URL in tests: ' + action.url));
          }
        },
        mediateActor: (action) => {
          return action.url === 'http://example.org/'
            ? Promise.resolve(true) : Promise.reject(new Error('Invalid paged-next URL in tests'));
        },
      };
      mediatorDereferencePagedIterator = { mediate: (action) => {
          const combinedStream = CombinedStream.create();
          combinedStream.append(stream0);
          combinedStream.append(stream1);
          combinedStream.append(stream2);
          combinedStream.end();
          return Promise.resolve({ iterator: combinedStream });
          }
      };
      cacheSize = 0;
      actor = new ActorRdfDereferencePagedHypermedia({
        bus,
        cacheSize,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        mediatorDereferencePagedIterator,
        name: 'actor',
      });
      actorCached = new ActorRdfDereferencePagedHypermedia({
        bus,
        cacheSize: 100,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        mediatorDereferencePagedIterator,
        name: 'actor',
      });
    });

    it('should test if the dereference mediator can test', () => {
      return expect(actor.test({ url: 'http://example.org/' })).resolves.toBeTruthy();
    });

    it('should not test if the dereference mediator can test', () => {
      return expect(actor.test({ url: 'http://example2.org/' })).rejects.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ url: 'http://example.org/' })
        .then(async (output) => {
          expect(output.firstPageUrl).toEqual('0');
          expect(output.triples).toEqual(true);
          expect(await output.firstPageMetadata()).toEqual({ next: 'http://example.org/1' });
          expect(output.data).not.toBeInstanceOf(ClonedIterator);
          expect(await arrayifyStream(output.data)).toEqual([
            '0a', '0b', '0c',
            '1a', '1b', '1c',
            '2a', '2b', '2c',
          ]);
        });
    });

    it('should run when metadata extraction is delayed', () => {
      const mediatorMetadataExtractSlow: any = { mediate: (action) => {
        return new Promise((resolve, reject) => {
          setImmediate(() => {
            mediatorMetadataExtract.mediate(action).then(resolve).catch(reject);
          });
        });
      }};
      const currentActor = new ActorRdfDereferencePagedHypermedia({
        bus,
        cacheSize,
        mediatorMetadata,
        mediatorMetadataExtract: mediatorMetadataExtractSlow,
        mediatorRdfDereference,
        mediatorDereferencePagedIterator,
        name: 'actor',
      });
      return currentActor.run({ url: 'http://example.org/' })
        .then(async (output) => {
          expect(output.firstPageUrl).toEqual('0');
          expect(output.triples).toEqual(true);
          expect(await output.firstPageMetadata()).toEqual({ next: 'http://example.org/1' });
          expect(await arrayifyStream(output.data)).toEqual([
            '0a', '0b', '0c',
            '1a', '1b', '1c',
            '2a', '2b', '2c',
          ]);
        });
    });

    it('should run and delegate errors originating from streams', () => {
      const error = new Error('some error');
      stream1._read = () => stream1.emit('error', error);
      return actor.run({ url: 'http://example.org/' })
        .then((output) => expect(arrayifyStream(output.data)).rejects.toEqual(error));
    });

    it('should not run on errors originating from a metadata mediator on page 0', () => {
      const error = new Error('some error');
      const currentMediatorMetadata: any = {
        mediate: () => Promise.reject(error),
      };
      const currentActor = new ActorRdfDereferencePagedHypermedia({
        bus,
        cacheSize,
        mediatorMetadata: currentMediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        mediatorDereferencePagedIterator,
        name: 'actor',
      });
      return expect(currentActor.run({ url: 'http://example.org/' })).rejects.toEqual(error);
    });

    it('should run on errors originating from a metadata extract mediator on page 0 but should delegate errors ' +
      'to the metadata promise *and* stream', () => {
        const error = new Error('an error on page 0');
        const currentMediatorMetadataExtract: any = {
          mediate: () => Promise.reject(error),
        };
        const currentActor = new ActorRdfDereferencePagedHypermedia({
          bus,
          cacheSize,
          mediatorMetadata,
          mediatorMetadataExtract: currentMediatorMetadataExtract,
          mediatorRdfDereference,
        mediatorDereferencePagedIterator,
          name: 'actor',
        });
        return currentActor.run({ url: 'http://example.org/' })
          .then((output) => {
            expect(output.firstPageMetadata()).rejects.toEqual(error);
            expect(arrayifyStream(output.data)).rejects.toEqual(error);
          });
      });

    it('should not run on errors originating from a dereference mediator on page 0', () => {
      const error = new Error('some error on page 0');
      const currentMediatorRdfDereference: any = {
        mediate: () => Promise.reject(error),
      };
      const currentActor = new ActorRdfDereferencePagedHypermedia({
        bus,
        cacheSize,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference: currentMediatorRdfDereference,
        mediatorDereferencePagedIterator,
        name: 'actor',
      });
      return expect(currentActor.run({ url: 'http://example.org/' })).rejects.toEqual(error);
    });

    it('should run and delegate errors originating from a metadata mediator after page 0', () => {
      const error = new Error('some error after page 0');
      const mediatorMetadataTemp: any = { mediate: (action) => {
        const ret = mediatorMetadata.mediate(action);
        mediatorMetadataTemp.mediate = () => Promise.reject(error);
        return ret;
      }};
      const currentActor = new ActorRdfDereferencePagedHypermedia({
        bus,
        cacheSize,
        mediatorMetadata: mediatorMetadataTemp,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        mediatorDereferencePagedIterator,
        name: 'actor',
      });
      return currentActor.run({ url: 'http://example.org/' })
        .then((output) => expect(arrayifyStream(output.data)).rejects.toEqual(error));
    });

    it('should run and delegate errors originating from an extract mediator after page 0', () => {
      const error = new Error('some error');
      const mediatorMetadataExtractTemp: any = { mediate: (action) => {
        const ret = mediatorMetadataExtract.mediate(action);
        mediatorMetadataExtractTemp.mediate = () => Promise.reject(error);
        return ret;
      }};
      actor = new ActorRdfDereferencePagedHypermedia({
        bus,
        cacheSize,
        mediatorMetadata,
        mediatorMetadataExtract: mediatorMetadataExtractTemp,
        mediatorRdfDereference,
        mediatorDereferencePagedIterator,
        name: 'actor',
      });
      return actor.run({ url: 'http://example.org/' })
        .then((output) => expect(arrayifyStream(output.data)).rejects.toEqual(error));
    });

    it('should run and delegate errors originating from a dereference mediator after page 0', () => {
      const error = new Error('some error');
      const mediatorRdfDereferenceTemp: any = { mediate: (action) => {
        const ret = mediatorRdfDereference.mediate(action);
        mediatorRdfDereferenceTemp.mediate = () => Promise.reject(error);
        return ret;
      }};
      actor = new ActorRdfDereferencePagedHypermedia({
        bus,
        cacheSize,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference: mediatorRdfDereferenceTemp,
        mediatorDereferencePagedIterator,
        name: 'actor',
      });
      return actor.run({ url: 'http://example.org/' })
        .then((output) => expect(arrayifyStream(output.data)).rejects.toEqual(error));
    });

    it('should run with an enabled cache', () => {
      return actorCached.run({ url: 'http://example.org/' })
        .then(async (output) => {
          expect(output.firstPageUrl).toEqual('0');
          expect(output.triples).toEqual(true);
          expect(await output.firstPageMetadata()).toEqual({ next: 'http://example.org/1' });
          expect(output.data).toBeInstanceOf(ClonedIterator);
          expect(await arrayifyStream(output.data)).toEqual([
            '0a', '0b', '0c',
            '1a', '1b', '1c',
            '2a', '2b', '2c',
          ]);
        });
    });

    it('should run with an enabled cache and clone the output from the first call for the same URL', () => {
      return Promise.all([
        actorCached.run({ url: 'http://example.org/' }),
        actorCached.run({ url: 'http://example.org/' }),
      ]).then(async (outputs) => {
        for (const output of outputs) {
          expect(output.firstPageUrl).toEqual('0');
          expect(output.triples).toEqual(true);
          expect(await output.firstPageMetadata()).toEqual({ next: 'http://example.org/1' });
          expect(output.data).toBeInstanceOf(ClonedIterator);
          expect(await arrayifyStream(output.data)).toEqual([
            '0a', '0b', '0c',
            '1a', '1b', '1c',
            '2a', '2b', '2c',
          ]);
        }
        expect((<any> actorCached).cache.length).toEqual(1);
      });
    });
  });
});
