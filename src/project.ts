import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import notGate from './scenes/notGate?scene';
import andGates from './scenes/andGates?scene';
import orGates from './scenes/orGates?scene';
import halfAdder from './scenes/halfAdder?scene';
import fullAdder from './scenes/fullAdder?scene';
import twosCompliment from './scenes/twosCompliment?scene';
import clock from './scenes/clock?scene';
import flipflop from './scenes/flipflop?scene';
// import help from './scenes/help?scene';

export default makeProject({
  scenes: [flipflop, notGate, andGates, orGates, halfAdder, fullAdder, twosCompliment, clock],
  variables: {backgroundColor: '#2c2938'}
});
