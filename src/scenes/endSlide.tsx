import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt} from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef} from '@motion-canvas/core/lib/utils';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {Direction} from '@motion-canvas/core/lib/types';
import { loop } from '@motion-canvas/core/lib/flow';
import { MCLogo } from '../extras/motionCanvasLogoComponent';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
    const mcLogo = createRef<MCLogo>();
    view.fill(colors.BACKGROUND_COLOR);
    view.add(
        <>
            <Txt
                position={[0,-300]}
                fontSize={100}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"The end!"}
            />
            <Txt
                position={[-120,0]}
                fontSize={50}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"Made with Motion Canvas"}
            />
            <MCLogo position={[350, -45]} ref={mcLogo}/>
            <Layout position={[0, 300]}layout direction={'column'}>
                <Txt
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={"More resources:"}
                />
                <Txt
                    fontSize={40}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={"- Wikipedia.org, seriously."}
                />
                <Txt
                    fontSize={40}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={"- Ben Eater on youtube (https://www.youtube.com/@BenEater)"}
                />
                <Txt
                    fontSize={40}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={"- NAND to Tetris (https://www.nand2tetris.org/)"}
                />
                <Txt
                    fontSize={40}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={"- Code: The Hidden Language of Computer Hardware and Software, by Charles Petzold (Book)"}
                />
                <Txt
                    fontSize={40}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={"- Slides available at https://github.com/JacobPuff/rocks-into-computers"}
                />
            </Layout>
        </>
    );
    yield loop(sizes.LOOP_LENGTH, function* (){
        yield* mcLogo().animate();
    })

    yield* slideTransition(Direction.Right, 1);
    
    yield* beginSlide("the end!")
});