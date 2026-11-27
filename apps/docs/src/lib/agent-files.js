/** The generated agent files (scripts/agent), built once per docs build and shared by the endpoints. */
import { agentOutputs } from '../../../../scripts/agent/index.mjs';
import { loadInputs } from '../../../../scripts/agent/inputs.mjs';

/** @type {ReturnType<typeof agentOutputs> | undefined} */
let outputs;

export function agentFiles() {
  outputs ??= agentOutputs(loadInputs());

  return outputs;
}
