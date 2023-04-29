import { CubicBezier, Layout, Line, QuadBezier, Rect, Spline, Txt, Img, Video} from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, makeRef, useLogger} from '@motion-canvas/core/lib/utils';
import { waitFor } from '@motion-canvas/core/lib/flow';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {

  view.fill(colors.BACKGROUND_COLOR);
  view.add (<>
  </>)
  yield* waitFor(0.5)
  yield* beginSlide("help");

});