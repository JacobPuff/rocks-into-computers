import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Txt} from '@motion-canvas/2d/lib/components';
import {beginSlide} from '@motion-canvas/core/lib/utils';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {Direction} from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
    view.fill(colors.BACKGROUND_COLOR);
    view.add(
        <>
            <Txt
                position={[0,0]}
                fontSize={70}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"We're not gonna go over how silicon itself works."}
            />
        </>
    );

    yield* slideTransition(Direction.Right, 1);
    yield* beginSlide("silicon disclaimer")
});