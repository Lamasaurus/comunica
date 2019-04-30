import { Bindings } from "@comunica/bus-query-operation";
import { ActionContext, Bus } from "@comunica/core";
import { literal } from "@rdfjs/data-model";
import { ArrayIterator } from "asynciterator";
import { ActorQueryOperationFilterTreeString } from "../";

describe("ActorQueryOperationFilterTreeString", () => {
  const bus: any = new Bus({ name: "bus" });
  const mediatorQueryOperation: any = {
    mediate: (arg) =>
      Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ "?a": literal("1") }),
          Bindings({ "?a": literal("2") }),
          Bindings({ "?a": literal("3") }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: "bindings",
        variables: ["a"],
      }),
  };

  const truthyExpression = {
    args: [
      { type: "expression", expressionType: "term", term: { value: "o" } },
      {
        expressionType: "term",
        term: {
          datatype: { value: "http://www.w3.org/2001/XMLSchema#string" },
          value: "A",
        },
        type: "expression",
      },
    ],
    expressionType: "operator",
    operator: "strstarts",
    type: "expression",
  };
  const falsyExpression = {
    operator: "something else",
  };

  const actor = new ActorQueryOperationFilterTreeString({
    bus,
    mediatorQueryOperation,
    name: "actor",
  });

  describe("test", () => {
    it("should test positively on a STRSTARTS filter.", () => {
      const op = {
        context: ActionContext({}),
        operation: { type: "filter", expression: truthyExpression },
      };
      expect(actor.test(op)).resolves.toBeTruthy();
    });

    it("should reject when no STRSTARTS filter.", () => {
      const op = {
        context: ActionContext({}),
        operation: { type: "filter", expression: falsyExpression },
      };
      expect(actor.test(op)).rejects.toThrow();
    });

    it("should reject when filter already in context.", () => {
      const op = {
        context: ActionContext({ "@comunica/actor-rdf-metadata-extract-tree:nameFilter": "something" }),
        operation: { type: "filter", expression: truthyExpression },
      };
      expect(actor.test(op)).rejects.toThrow();
    });
  });

  describe("run", () => {
    it("should set the context variable.", () => {
      const op = {
        context: ActionContext({}),
        operation: { type: "filter", expression: truthyExpression },
      };

      op.context.set = jest.fn((key: string, value: string) => {
        expect(key).toEqual("@comunica/actor-rdf-metadata-extract-tree:nameFilter");
        expect(value).toEqual("A");
        return op.context;
      });

      actor.run(op);
    });
  });
});
