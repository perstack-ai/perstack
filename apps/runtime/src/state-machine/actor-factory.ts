import { createActor } from "xstate"
import { type RunActor, runtimeStateMachine } from "./machine.js"

export type ActorInput = Parameters<typeof createActor<typeof runtimeStateMachine>>[1]

/**
 * Factory interface for creating xstate actors.
 * Allows for dependency injection and easier testing.
 */
export interface ActorFactory {
  create(input: ActorInput): RunActor
}

/**
 * Default implementation of ActorFactory using xstate's createActor.
 */
export class DefaultActorFactory implements ActorFactory {
  create(input: ActorInput): RunActor {
    return createActor(runtimeStateMachine, input)
  }
}

/**
 * Default actor factory instance.
 */
export const defaultActorFactory = new DefaultActorFactory()
