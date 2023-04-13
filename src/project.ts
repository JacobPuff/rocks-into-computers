import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import secondScene from './scenes/secondScene?scene';

export default makeProject({
  scenes: [example],
  variables: {backgroundColor: '#2c2938'}
});
