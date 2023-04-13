import {makeScene2D, } from '@motion-canvas/2d/lib/scenes';
import {Circle, Txt} from '@motion-canvas/2d/lib/components';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {waitFor, waitUntil} from '@motion-canvas/core/lib/flow';
import {beginSlide, createRef} from '@motion-canvas/core/lib/utils';
import {Direction} from '@motion-canvas/core/lib/types';
import {BACKGROUND_COLOR} from '../globalColors'

export default makeScene2D(function* (view) {
  const text = createRef<Txt>();
  view.fill(BACKGROUND_COLOR);
  view.add(<>
    <Circle
      width={140}
      height={140}
      fill="#403238"/>
    <Txt ref={text} text='TEST TEXT'/>
  </>);
  // perform a slide transition to the left:
  yield* slideTransition(Direction.Left, 1);
  yield* beginSlide("two")


  // proceed with the animation
  // yield* waitUntil('test');
  // yield* text().text('Yolo McSwaggins', 1);
  // yield* waitFor(2)
  // yield* text().text('3ans789dnfjk', 0.2);
  yield* text().text('Yolo McSwaggins', 1);
});