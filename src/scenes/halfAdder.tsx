import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt } from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, makeRef, useLogger} from '@motion-canvas/core/lib/utils';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import { AndGate } from '../basics/and';
import { XorGate } from '../basics/xor';
import { HalfAdder } from '../circuits/halfAdder';
import {all, waitFor} from '@motion-canvas/core/lib/flow';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {Direction, Vector2} from '@motion-canvas/core/lib/types';
import { loop, delay } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { createSignal } from '@motion-canvas/core/lib/signals';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
    const slideTitle = createRef<Txt>();
    const truthTables: TruthTable[] = []
    const xorGate = createRef<XorGate>();
    const andGate = createRef<AndGate>();
    const halfAdder = createRef<HalfAdder>();
    const internalsLayout = createRef<Layout>();
    const halfAdderLayout = createRef<Layout>();
    const xorWires = createRef<Layout>();
    const andWires = createRef<Layout>();
    let currentTable = 0
    const inputA = createSignal(()=>truthTables[currentTable].outputRow()[0] == 1)
    const inputB = createSignal(()=>truthTables[currentTable].outputRow()[1] == 1)
    const wires: Wire[] = [];
    const AInputBreakY = 230
    const BInputBreakY = 190

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
                text={"Adding Two Bits"}
            />
            <TruthTable
                ref={makeRef(truthTables, truthTables.length)}
                position={[-400,0]}
                columnNames={["A", "B", "Sum"]}
                columnData={[
                    [0,0,0],
                    [1,0,1],
                    [0,1,1],
                ]}
            />
            <TruthTable
                ref={makeRef(truthTables, truthTables.length)}
                opacity={0}
                position={[-400,0]}
                columnNames={["A", "B", "Sum", "Carry"]}
                columnData={[
                    [0,0,0,0],
                    [1,0,1,0],
                    [0,1,1,0],
                    [1,1,0,1],
                ]}
            />
            <Layout ref={internalsLayout} opacity={1}>
                
                <XorGate
                    ref={xorGate}
                    position={[130,50]}
                    inputA={inputA}
                    inputB={inputB}
                    opacity={0}
                />
                <AndGate
                    ref={andGate}
                    position={[-130,50]}
                    inputA={inputA}
                    inputB={inputB}
                    opacity={0}
                />
                <Layout
                    ref={xorWires}
                    opacity={0}
                >
                    {/* Using and gate position for later */}
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={inputA}
                        points={[
                            [andGate().inputAPos.x,300],
                            [andGate().inputAPos.x,AInputBreakY],
                            [xorGate().inputAPos.x,AInputBreakY],
                            [xorGate().inputAPos.x,xorGate().inputAPos.y],
                        ]}
                    />
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={inputB}
                        points={[
                            [xorGate().inputBPos.x,300],
                            [xorGate().inputBPos.x,xorGate().inputBPos.y]
                        ]}
                    />
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={xorGate().output}
                        points={[
                            xorGate().outputPos,
                            [xorGate().outputPos.x,xorGate().outputPos.y-100],
                        ]}
                    />
                    <VisualIO
                        name={"Sum"}
                        powered={xorGate().output}
                        position={[xorGate().outputPos.x,xorGate().outputPos.y-100]}
                    />
                </Layout>
                <Layout
                    ref={andWires}
                    opacity={0}
                >
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={inputA}
                        jointStart
                        points={[
                            [andGate().inputAPos.x,AInputBreakY],
                            andGate().inputAPos,
                        ]}
                    />
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={inputB}
                        jointStart
                        points={[
                            [xorGate().inputBPos.x,BInputBreakY],
                            [andGate().inputBPos.x,BInputBreakY],
                            andGate().inputBPos,
                        ]}
                    />
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={andGate().output}
                        points={[
                            andGate().outputPos,
                            [andGate().outputPos.x,xorGate().outputPos.y-100],
                        ]}
                    />
                    <VisualIO
                        name={"Carry"}
                        powered={andGate().output}
                        position={[andGate().outputPos.x,andGate().outputPos.y-100]}
                    />
                </Layout>
                <VisualIO
                    name={"A"}
                    powered={inputA}
                    position={[andGate().inputAPos.x,300]}
                />
                <VisualIO
                    name={"B"}
                    powered={inputB}
                    position={[xorGate().inputBPos.x,300]}
                />
            </Layout>
            <Layout
                ref={halfAdderLayout}
                position={[0,50]}
                opacity={0}
            >
                <HalfAdder
                    ref={halfAdder}
                    inputA={inputA}
                    inputB={inputB}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={inputA}
                    points={[
                        [halfAdder().inputAPos.x,150],
                        halfAdder().inputAPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={inputB}
                    points={[
                        [halfAdder().inputBPos.x,150],
                        halfAdder().inputBPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={halfAdder().sum}
                    points={[
                        halfAdder().sumPos,
                        [halfAdder().sumPos.x,halfAdder().sumPos.y-100],
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={halfAdder().carry}
                    points={[
                        halfAdder().carryPos,
                        [halfAdder().carryPos.x,halfAdder().carryPos.y-100],
                    ]}
                />
                <VisualIO
                    name={"A"}
                    powered={inputA}
                    position={[halfAdder().inputAPos.x,150]}
                />
                <VisualIO
                    name={"B"}
                    powered={inputB}
                    position={[halfAdder().inputBPos.x,150]}
                />
                <VisualIO
                    name={"Sum"}
                    powered={halfAdder().sum}
                    position={[halfAdder().sumPos.x,halfAdder().sumPos.y-100]}
                />
                <VisualIO
                    name={"Carry"}
                    powered={halfAdder().carry}
                    position={[halfAdder().carryPos.x,halfAdder().carryPos.y-100]}
                />
            </Layout>
        </>
    );
    // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
    wires.reverse().forEach(v => v.moveToBottom());
    andWires().moveToBottom()
    xorWires().moveToBottom()

    const bgAnimateWires = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* all(...wires.map(w=>w.animate()))
    })
    yield* slideTransition(Direction.Right, 1);
    waitFor(0.5)
    const bgSelectRows = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* all (
            ...truthTables.map(table=>{
                // Used this way to sync the two tables selectors so the inputs don't jitter.
                let nextRow = (truthTables[currentTable].currentOutputLine()+1) % truthTables[currentTable].columnData().length
                return table.select(nextRow, sizes.TRUTH_TABLE_DEFAULT_SPEED)
            })
        )
        yield* waitFor(1)
        
    })
    yield* beginSlide("add two bits intro");
    yield* all(
        xorWires().opacity(1,1),
        xorGate().opacity(1,1),
    )
    yield* beginSlide("add two bits xor");
    inputA(()=>truthTables[1].outputRow()[0] == 1)
    inputB(()=>truthTables[1].outputRow()[1] == 1)
    yield* truthTables[0].opacity(0,0.5),
    yield* truthTables[1].opacity(1,0.5),
    truthTables[0].remove()
    currentTable = 1

    yield* beginSlide("updated truthtable");
    yield* all(
        andWires().opacity(1,1),
        andGate().opacity(1,1),
    )
    yield* beginSlide("add two bits and");
    yield* all(
        internalsLayout().scale(0,2),
        internalsLayout().opacity(0,1),
        delay(0.7,halfAdderLayout().opacity(1,1)),
        delay(0.7,slideTitle().text("Half Adder",1)),
    )
    yield* beginSlide("scaled down circuit, reveal HalfAdder");
    yield* beginSlide("Reveal ripple adder")
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});