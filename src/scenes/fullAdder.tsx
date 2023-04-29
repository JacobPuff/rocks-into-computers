import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt } from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, makeRef, useLogger} from '@motion-canvas/core/lib/utils';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import { OrGate } from '../basics/or';
import { HalfAdder } from '../circuits/halfAdder';
import { FullAdder } from '../circuits/fullAdder';
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
    const firstHalfAdder = createRef<HalfAdder>();
    const secondHalfAdder = createRef<HalfAdder>();
    const orGate = createRef<OrGate>();
    const internalsLayout = createRef<Layout>();
    const secondHalfAdderWires = createRef<Layout>();
    const orCarryOutWires = createRef<Layout>();
    const superInts = "¹²³⁴⁵⁶⁷⁸"
    
    const fullAdderWires = createRef<Layout>();
    const fullAdder = createRef<FullAdder>();
    const inputA = createSignal(()=>truthTables[0].outputRow()[0] == 1)
    const inputB = createSignal(()=>truthTables[0].outputRow()[1] == 1)
    const carryIn = createSignal(()=>truthTables[0].outputRow()[2] == 1)
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
                text={"Handling the Carry"}
            />
            <TruthTable
                ref={makeRef(truthTables, truthTables.length)}
                position={[-400,0]}
                columnNames={["A¹", "B¹", "Cᶦⁿ", "-", "Sum", "Cᵒᵘᵗ"]}
                columnData={[
                    [0,0,0,"-",0,0],
                    [1,0,0,"-",1,0],
                    [0,1,0,"-",1,0],
                    [0,0,1,"-",1,0],
                    [1,1,0,"-",0,1],
                    [1,0,1,"-",0,1],
                    [1,1,1,"-",1,1],
                ]}
            />
            <Layout
                ref={internalsLayout}
                position={[-30,200]}
                opacity={1}
            >
                <HalfAdder
                    ref={firstHalfAdder}
                    inputA={inputA}
                    inputB={inputB}
                />
                <HalfAdder
                    ref={secondHalfAdder}
                    opacity={0}
                    // Shift position over to line up sum and inputA
                    position={[firstHalfAdder().sumPos.x+firstHalfAdder().inputBPos.x,-130]}
                    inputA={firstHalfAdder().sum}
                    inputB={carryIn}
                />
                <OrGate
                    ref={orGate}
                    opacity={0}
                    // Shift position over to line up carry and inputA
                    position={[firstHalfAdder().carryPos.x+new OrGate().inputBPos.x,-300]}
                    inputA={firstHalfAdder().carry}
                    inputB={secondHalfAdder().carry}
                />
                {/* Inputs for A and B */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={inputA}
                    points={[
                        [firstHalfAdder().inputAPos.x,100],
                        firstHalfAdder().inputAPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={inputB}
                    points={[
                        [firstHalfAdder().inputBPos.x,100],
                        firstHalfAdder().inputBPos,
                    ]}
                />
                <VisualIO
                    name={"A¹"}
                    powered={inputA}
                    position={[firstHalfAdder().inputAPos.x,100]}
                />
                <VisualIO
                    name={"B¹"}
                    powered={inputB}
                    position={[firstHalfAdder().inputBPos.x,100]}
                />
                <Layout ref={secondHalfAdderWires} opacity={0}>
                    {/* First sum to second half adder */}
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={firstHalfAdder().sum}
                        points={[
                            firstHalfAdder().sumPos,
                            secondHalfAdder().inputAPos,
                        ]}
                    />
                    {/* Carry in */}
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={carryIn}
                        points={[
                            [secondHalfAdder().inputBPos.x+100,secondHalfAdder().inputBPos.y+50],
                            [secondHalfAdder().inputBPos.x,secondHalfAdder().inputBPos.y+50],
                            secondHalfAdder().inputBPos,
                        ]}
                    />
                    {/* Sum out */}
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={secondHalfAdder().sum}
                        points={[
                            secondHalfAdder().sumPos,
                            [secondHalfAdder().sumPos.x,orGate().outputPos.y-70],
                        ]}
                    />
                    <VisualIO
                        name={"Cᶦⁿ"}
                        powered={carryIn}
                        position={[secondHalfAdder().inputBPos.x+100,secondHalfAdder().inputBPos.y+50]}
                    />
                    <VisualIO
                        name={"Sum"}
                        powered={secondHalfAdder().sum}
                        position={[secondHalfAdder().sumPos.x,orGate().outputPos.y-70]}
                    />
                </Layout>
                <Layout ref={orCarryOutWires} opacity={0}>
                    {/* Carry out OR gate inputs*/}
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={firstHalfAdder().carry}
                        points={[
                            firstHalfAdder().carryPos,
                            orGate().inputAPos,
                        ]}
                    />
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={secondHalfAdder().carry}
                        points={[
                            secondHalfAdder().carryPos,
                            [secondHalfAdder().carryPos.x,secondHalfAdder().carryPos.y-50],
                            [orGate().inputBPos.x,secondHalfAdder().carryPos.y-50],
                            orGate().inputBPos,
                        ]}
                    />
                    {/* Carry out */}
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={firstHalfAdder().carry}
                        points={[
                            orGate().outputPos,
                            [orGate().outputPos.x,orGate().outputPos.y-70]
                        ]}
                    />
                    <VisualIO
                        name={"Cᵒᵘᵗ"}
                        powered={orGate().output}
                        position={[orGate().outputPos.x,orGate().outputPos.y-70]}
                    /> 
                </Layout>
            </Layout>
            
            <FullAdder
                ref={fullAdder}
                inputA={inputA}
                inputB={inputB}
                carryIn={carryIn}
                opacity={0}
            />
            <Layout ref={fullAdderWires} opacity={0}>
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={inputA}
                    points={[
                        [fullAdder().inputAPos.x,150],
                        fullAdder().inputAPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={inputB}
                    points={[
                        [fullAdder().inputBPos.x,150],
                        fullAdder().inputBPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={carryIn}
                    points={[
                        [fullAdder().carryInPos.x+100,fullAdder().carryInPos.y],
                        fullAdder().carryInPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={fullAdder().carryOut}
                    points={[
                        fullAdder().carryOutPos,
                        [fullAdder().carryOutPos.x,fullAdder().carryOutPos.y-90]
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={fullAdder().sum}
                    points={[
                        fullAdder().sumPos,
                        [fullAdder().sumPos.x,fullAdder().sumPos.y-90]
                    ]}
                />
                <VisualIO
                    name={"A¹"}
                    powered={inputA}
                    position={[fullAdder().inputAPos.x,150]}
                />
                <VisualIO
                    name={"B¹"}
                    powered={inputB}
                    position={[fullAdder().inputBPos.x,150]}
                />
                <VisualIO
                    name={"Cᶦⁿ"}
                    powered={carryIn}
                    position={[fullAdder().carryInPos.x+100,fullAdder().carryInPos.y]}
                />
                <VisualIO
                    name={"Cᵒᵘᵗ"}
                    powered={fullAdder().carryOut}
                    position={[fullAdder().carryOutPos.x,fullAdder().carryOutPos.y-90]}
                />
                <VisualIO
                    name={"Sum"}
                    powered={fullAdder().sum}
                    position={[fullAdder().sumPos.x,fullAdder().sumPos.y-90]}
                />
            </Layout>
        </>
    );
    // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
    wires.reverse().forEach(v => v.moveToBottom());
    secondHalfAdderWires().moveToBottom();
    orCarryOutWires().moveToBottom();
    fullAdderWires().moveToBottom();

    const bgAnimateWires = yield loop(10000, function* (){
        yield* all(...wires.map(w=>w.animate()))
    })
    yield* slideTransition(Direction.Right, 1);
    waitFor(0.5)
    let bgSelectRows = yield loop(10000, function* (){
        yield* all (
            ...truthTables.map(table=>{
                let nextRow = (table.currentOutputLine()+1) % table.columnData().length
                return table.select(nextRow, sizes.TRUTH_TABLE_DEFAULT_SPEED)
            })
        )
        yield* waitFor(1)
        
    })
    yield* beginSlide("first HalfAdder");
    yield* all (
        secondHalfAdder().opacity(1,1),
        secondHalfAdderWires().opacity(1,1),
    )
    yield* beginSlide("second HalfAdder");
    yield* all (
        orGate().opacity(1,1),
        orCarryOutWires().opacity(1,1),
    )
    yield* beginSlide("OR gate carry out");
    yield* all(
        internalsLayout().scale(0,2),
        internalsLayout().opacity(0,1),
        delay(0.7,fullAdderWires().opacity(1,1)),
        delay(0.7,fullAdder().opacity(1,1)),
        delay(0.7,slideTitle().text("Full Adder",1)),
    )
    yield* beginSlide("scaled down circuit, reveal FullAdder");
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});