import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import notGate from './scenes/notGate?scene';
import andGates from './scenes/andGates?scene';
import orGates from './scenes/orGates?scene';
import secondScene from './scenes/secondScene?scene';
// import help from './scenes/help?scene';

export default makeProject({
  scenes: [notGate, andGates, orGates],
  variables: {backgroundColor: '#2c2938'}
});
