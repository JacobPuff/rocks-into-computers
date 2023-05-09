import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Txt } from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, makeRef} from '@motion-canvas/core/lib/utils';
import { NotGate } from '../basics/not';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import {all, waitFor} from '@motion-canvas/core/lib/flow';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {Direction} from '@motion-canvas/core/lib/types';
import { loop } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { createSignal } from '@motion-canvas/core/lib/signals';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
    const slideTitle = createRef<Txt>();
    const notGates: NotGate[] = []
    const wires: Wire[] = [];

    view.fill(colors.BACKGROUND_COLOR);
    view.add(
        <>
            <Txt
                ref={slideTitle}
                position={[0,-300]}
                fontSize={50}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"Keeping time and maintaining a speed"}
            />
            <NotGate
                ref={makeRef(notGates, notGates.length)}
                position={[-200,0]}
                rotation={90}
            />
            <NotGate
                ref={makeRef(notGates, notGates.length)}
                position={[0,0]}
                rotation={90}
                inputA={true}
            />
            <NotGate
                ref={makeRef(notGates, notGates.length)}
                position={[200,0]}
                rotation={90}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={notGates[2].output}
                points={[
                    notGates[2].outputPos,
                    [notGates[2].outputPos.x+100, notGates[2].outputPos.y],
                    [notGates[2].outputPos.x+100, notGates[2].outputPos.y+100],
                    [notGates[0].inputPos.x-100, notGates[0].inputPos.y+100],
                    [notGates[0].inputPos.x-100, notGates[0].inputPos.y],
                    notGates[0].inputPos,
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={notGates[0].output}
                points={[
                    notGates[0].outputPos,
                    notGates[1].inputPos,
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={notGates[1].output}
                points={[
                    notGates[1].outputPos,
                    notGates[2].inputPos,
                ]}
            />
            {/* Output wire */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={notGates[2].output}
                jointStart
                points={[
                    [notGates[2].outputPos.x+100, notGates[2].outputPos.y],
                    [notGates[2].outputPos.x+250, notGates[2].outputPos.y],
                ]}
            />
            <VisualIO
                position={[notGates[2].outputPos.x+250, notGates[2].outputPos.y]}
                powered={notGates[2].output}
                name={"Clock Out"}
            />
        </>
    );
    // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
    wires.reverse().forEach(v => v.moveToBottom());

    const bgAnimateWires = yield loop(10000, function* (){
        yield* all(...wires.map(w=>w.animate()))
    })
    yield* slideTransition(Direction.Right, 1);
    
    const propagationDelay = createSignal(1)
    yield* waitFor(1)
    const bgPropogateOutputs = yield loop(10000, function* (){
        yield* waitFor(propagationDelay())
        notGates[0].inputA(!notGates[0].inputA())
        yield* waitFor(propagationDelay())
        notGates[1].inputA(!notGates[1].inputA())
        yield* waitFor(propagationDelay())
        notGates[2].inputA(!notGates[2].inputA())
    })
    yield* beginSlide("intro to clocks");
    const propagationText = createRef<Txt>()
    view.add(<Txt
        ref={propagationText}
        opacity={0}
        position={[300,-150]}
        fontWeight={sizes.DEFAULT_FONT_WEIGHT}
        fontSize={25}
        fill={colors.TEXT_COLOR}
        fontFamily="Helvetica"
        text={()=>`Propagation delay: ${propagationDelay().toFixed(2)}s (${(1/(propagationDelay()*6)).toFixed(2)} hertz clock)`}
    />)
    yield* propagationText().opacity(1,0.5)
    yield* beginSlide("propagation delay");
    yield* slideTitle().text("Ring Oscillator", 1)
    yield* beginSlide("ring oscillator");
    yield* propagationDelay(1/6,1)
    yield* beginSlide("1 Hz clock");
    cancel(bgAnimateWires);
});