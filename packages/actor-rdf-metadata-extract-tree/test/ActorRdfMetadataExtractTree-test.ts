import { ActorRdfMetadataExtractTree } from "../lib/ActorRdfMetadataExtractTree";
const stream = require('streamify-array');
import { Readable } from "stream";
import { Bus } from "@comunica/core";
import { Tree } from "../lib/Tree";
const quad = require('rdf-quad');

describe("ActorRdfMetadataExtractTree", () => {
  let actor: ActorRdfMetadataExtractTree;
  let bus;

  const type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  const node = "https://w3id.org/tree#Node";
  const relation = "https://w3id.org/tree#hasChildRelation";
  const stringcompRelation = "https://w3id.org/tree#StringCompletesRelation";
  const child = "https://w3id.org/tree#child";
  const value = "https://w3id.org/tree#value";
  const member = "http://www.w3.org/ns/hydra/core#member";

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    actor = new ActorRdfMetadataExtractTree({ name: "actor", bus });
  });

  it("should test true", () => {
    expect(actor.test({ metadata: stream([]), pageUrl: "" })).resolves.toBe(true);
  });

  it('should be able to construct a tree from a stream', async () => {
    const metadata = stream([
      quad("nodeId", type, node),
      quad("nodeId", relation, "child"),
      quad("nodeId", child, "blankChild"),
      quad("nodeId", value, "A"),
      quad("blankNodeId", type, stringcompRelation),
      quad("nodeId", member, "blankMember"),
      quad("blankMember", "predicate", "object")
    ]);

    const result = await actor.run({ metadata, pageUrl: "" });
    expect(result.metadata.tree).toBeInstanceOf(Tree);
  });

  it("should not return a tree when non could be made", async () => {
    const result = await actor.run({ metadata: stream([]), pageUrl: "" });
    expect(result.metadata.tree).toBeFalsy();
  })
});
