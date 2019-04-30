import { Algebra } from "sparqlalgebrajs";

import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { ActionContext, IActorTest } from "@comunica/core";

import { KEY_CONTEXT_TREE_RELATION_STRING } from "@comunica/actor-rdf-metadata-extract-tree";

/**
 * A comunica Filter Tree String Query Operation Actor.
 */
export class ActorQueryOperationFilterTreeString extends ActorQueryOperationTypedMediated<
  Algebra.Filter
> {
  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, "filter");
  }

  public async testOperation(
    pattern: Algebra.Filter,
    context: ActionContext,
  ): Promise<IActorTest> {
    if (context.get(KEY_CONTEXT_TREE_RELATION_STRING, false)) {
      throw new Error(`Tree String filter already applied.`);
    } else if (pattern.expression.operator !== "strstarts") {
      throw new Error(`Tree String filter works on STRSTARTS.`);
    }

    return true;
  }

  public async runOperation(
    pattern: Algebra.Filter,
    context: ActionContext,
  ): Promise<IActorQueryOperationOutputBindings> {
    // Set the context variable for the tree string filter
    context = context.set(
      KEY_CONTEXT_TREE_RELATION_STRING,
      pattern.expression.args[1].term.value,
    );

    // Mediate back to the operations
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({
        context,
        operation: pattern,
      }),
    );

    return {
      bindingsStream: output.bindingsStream,
      metadata: output.metadata,
      type: "bindings",
      variables: output.variables,
    };
  }
}
