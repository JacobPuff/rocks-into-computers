import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import notGate from './scenes/notGate?scene';
import andGate from './scenes/andGate?scene';
import orGate from './scenes/orGate?scene';
import secondScene from './scenes/secondScene?scene';
// import help from './scenes/help?scene';

export default makeProject({
  scenes: [orGate, notGate, andGate],
  variables: {backgroundColor: '#2c2938'}
});
