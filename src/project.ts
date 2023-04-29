import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import notGate from './scenes/notGate?scene';
import andGates from './scenes/andGates?scene';
import orGates from './scenes/orGates?scene';
import halfAdder from './scenes/halfAdder?scene';
import fullAdder from './scenes/fullAdder?scene';
// import help from './scenes/help?scene';

export default makeProject({
  scenes: [fullAdder, notGate, andGates, orGates, halfAdder],
  variables: {backgroundColor: '#2c2938'}
});
