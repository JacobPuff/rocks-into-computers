import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import title from './scenes/title?scene';
import siliconDisclaimer from './scenes/siliconDisclaimer?scene';
import notGate from './scenes/notGate?scene';
import andGates from './scenes/andGates?scene';
import orGates from './scenes/orGates?scene';
import halfAdder from './scenes/halfAdder?scene';
import fullAdder from './scenes/fullAdder?scene';
import twosCompliment from './scenes/twosCompliment?scene';
import clock from './scenes/clock?scene';
import flipflop from './scenes/flipflop?scene';
import registers from './scenes/registers?scene';
import programCounter from './scenes/programCounter?scene';
import theCPU from './scenes/theCPU?scene';
// import help from './scenes/help?scene';

export default makeProject({
  scenes: [title, siliconDisclaimer, notGate, andGates, orGates, halfAdder, fullAdder, twosCompliment, clock, flipflop, registers, programCounter, theCPU],
  variables: {backgroundColor: '#2c2938'}
});
