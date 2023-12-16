import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Txt} from '@motion-canvas/2d/lib/components';
import {beginSlide} from '@motion-canvas/core/lib/utils';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
    view.fill(colors.BACKGROUND_COLOR);
    view.add(
        <>
            <Txt
                position={[0,-100]}
                fontSize={100}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"Rocks Into Computers"}
            />
            <Txt
                position={[0,100]}
                fontSize={50}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"An over engineered presentation by Jacob Hansmann"}
            />
        </>
    );

    yield* beginSlide("title")
});