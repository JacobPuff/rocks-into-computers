import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt } from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, makeRef} from '@motion-canvas/core/lib/utils';
import { AndGate } from '../basics/and';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import {all, waitFor} from '@motion-canvas/core/lib/flow';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {Direction, Vector2} from '@motion-canvas/core/lib/types';
import { loop } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { createSignal } from '@motion-canvas/core/lib/signals';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
    const slideTitle = createRef<Txt>();
    const truthTables: TruthTable[] = []
    const andGate = createRef<AndGate>();
    const nandGate = createRef<AndGate>();
    const andUnit= createRef<Layout>();
    const nandUnit= createRef<Layout>();
    const andInputA = createSignal(()=>truthTables[0].outputRow()[0] == 1)
    const andInputB = createSignal(()=>truthTables[0].outputRow()[1] == 1)
    const nandInputA = createSignal(()=>truthTables[1].outputRow()[0] == 1)
    const nandInputB = createSignal(()=>truthTables[1].outputRow()[1] == 1)
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
                text={"The AND Gate"}
            />
            <Layout ref={andUnit}>
                <TruthTable
                    ref={makeRef(truthTables, truthTables.length)}
                    position={[100,0]}
                    columnNames={["A", "B", "Out"]}
                    columnData={[
                        [0,0,0],
                        [1,0,0],
                        [0,1,0],
                        [1,1,1],
                    ]}
                />
                <AndGate
                    ref={andGate}
                    position={[-100,-20]}
                    inputA={andInputA}
                    inputB={andInputB}
                />
                <VisualIO
                    powered={andInputA}
                    name={"A"}
                    position={[andGate().inputAPos.x-20,150]}
                />
                <VisualIO
                    powered={andInputB}
                    name={"B"}
                    position={[andGate().inputBPos.x+20,150]}
                />
                <VisualIO
                    powered={andGate().output}
                    name={"Out"}
                    position={[-100,-150]}
                />
                {/* Input A Wire */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={andInputA}
                    points={[
                        [andGate().inputAPos.x-20,150],
                        [andGate().inputAPos.x-20,90],
                        [andGate().inputAPos.x,90],
                        andGate().inputAPos
                    ]}
                />
                {/* Input B Wire */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={andInputB}
                    points={[
                        [andGate().inputBPos.x+20,150],
                        [andGate().inputBPos.x+20,90],
                        [andGate().inputBPos.x,90],
                        andGate().inputBPos
                    ]}
                />
                {/* Output Wire */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={andGate().output}
                    points={[
                        andGate().outputPos,
                        [-100,-150]
                    ]}
                />
            </Layout>

            <Layout ref={nandUnit} position={[300,0]} opacity={0}>
                <TruthTable
                    ref={makeRef(truthTables, truthTables.length)}
                    position={[100,0]}
                    columnNames={["A", "B", "Out"]}
                    columnData={[
                        [0,0,1],
                        [1,0,1],
                        [0,1,1],
                        [1,1,0],
                    ]}
                />
                <AndGate
                    ref={nandGate}
                    isNAND={true}
                    position={[-100,-20]}
                    inputA={nandInputA}
                    inputB={nandInputB}
                />
                <VisualIO
                    powered={nandInputA}
                    name={"A"}
                    position={[nandGate().inputAPos.x-20,150]}
                />
                <VisualIO
                    powered={nandInputB}
                    name={"B"}
                    position={[nandGate().inputBPos.x+20,150]}
                />
                <VisualIO
                    powered={nandGate().output}
                    name={"Out"}
                    position={[-100,-150]}
                />
                {/* Input A Wire */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={nandInputA}
                    points={[
                        [nandGate().inputAPos.x-20,150],
                        [nandGate().inputAPos.x-20,90],
                        [nandGate().inputAPos.x,90],
                        nandGate().inputAPos
                    ]}
                />
                {/* Input B Wire */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={nandInputB}
                    points={[
                        [nandGate().inputBPos.x+20,150],
                        [nandGate().inputBPos.x+20,90],
                        [nandGate().inputBPos.x,90],
                        nandGate().inputBPos
                    ]}
                />
                {/* Output Wire */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={nandGate().output}
                    points={[
                        nandGate().outputPos,
                        [-100,-150]
                    ]}
                />
            </Layout>
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
        yield* all (
            ...truthTables.map(table=>{
                let nextRow = (table.currentOutputLine()+1) % table.columnData().length
                return table.select(nextRow, sizes.TRUTH_TABLE_DEFAULT_SPEED)
            })
        )
        yield* waitFor(1)
        
    })
    yield* beginSlide("and gate");
    yield* all(
        slideTitle().text("The NAND Gate", 1),
        andUnit().position.x(-300, 1),
        nandUnit().opacity(1, 1),
    )
    yield* beginSlide("nand gate");
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});