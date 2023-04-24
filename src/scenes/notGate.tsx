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
    const notGate = createRef<NotGate>();
    const truthTable = createRef<TruthTable>();
    const input = createSignal(()=>truthTable().outputRow()[0] == 1)
    const wires: Wire[] = [];

    view.fill(colors.BACKGROUND_COLOR);
    view.add(
        <>
            <Txt
                position={[0,-300]}
                fontSize={50}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"The NOT Gate"}
            />
            <TruthTable
                ref={truthTable}
                position={[100,0]}
                columnNames={["In", "Out"]}
                columnData={[
                    [0,1],
                    [1,0],
                ]}
            />
            <NotGate
                ref={notGate}
                position={[-100,0]}
                inputA={input}
            />
            <VisualIO
                powered={input}
                name={"In"}
                position={[-100,150]}
            />
            <VisualIO
                powered={notGate().output}
                name={"Out"}
                position={[-100,-150]}
            />
            {/* Input Wire */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={input}
                points={[
                    [-100,150],
                    notGate().inputPos
                ]}
            />
            {/* Output Wire */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={notGate().output}
                points={[
                    notGate().outputPos,
                    [-100,-150]
                ]}
            />

        </>
    );
    // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
    wires.reverse().forEach(v => v.moveToBottom());

    const bgAnimateWires = yield loop(10000, function* (){
        yield* all(...wires.map(w=>w.animate()))
    })
    yield* slideTransition(Direction.Right, 1);
    waitFor(0.5)
    const bgSelectRows = yield loop(10000, function* (){
        let nextRow = (truthTable().currentOutputLine()+1) % truthTable().columnData().length
        yield* truthTable().select(nextRow, sizes.TRUTH_TABLE_DEFAULT_SPEED)
        yield* waitFor(1)
        
    })
    yield* beginSlide("not gate");
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});