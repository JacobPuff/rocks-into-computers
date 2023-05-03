import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt } from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, makeRef, range, useLogger} from '@motion-canvas/core/lib/utils';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import { OrGate } from '../basics/or';
import { HalfAdder } from '../circuits/halfAdder';
import { FullAdder } from '../circuits/fullAdder';
import {all, any, waitFor} from '@motion-canvas/core/lib/flow';
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
    const fullAdderWires = createRef<Layout>();
    const rippleAdderLayout = createRef<Layout>();
    const superInts = "⁰¹²³⁴⁵⁶⁷⁸⁹"
    
    const inputA = createSignal(()=>truthTables[0].outputRow()[0] == 1)
    const inputB = createSignal(()=>truthTables[0].outputRow()[1] == 1)
    const carryIn = createSignal(()=>truthTables[0].outputRow()[2] == 1)
    const rippleSpacing = 200
    const wires: Wire[] = [];
    
    const isRippleAdding = createSignal(false)
    const rippleTable = createSignal(1)
    const getInput = (bit:number, row: number, table: number) => {
        if (!isRippleAdding()) return false
        return truthTables[table].columnData()[row][1][rippleSize-bit-1] == "1"
    }

    const rippleSize = 8
    const rippleAdders: FullAdder[] = []
    range(rippleSize).forEach(i=> (
        rippleAdders.push(
            <FullAdder
                position={[i*-rippleSpacing,0]}
                inputA={()=>getInput(i,0,rippleTable())}
                inputB={()=>getInput(i,1,rippleTable())}
                carryIn={rippleAdders[i-1]?.carryOut || carryIn}
                opacity={0}
            />
        )
    ))
    const fullAdder = rippleAdders[0]
    const rippleWires: Layout[] = rippleAdders.map((rippleAdder,i)=>(
        <Layout opacity={0}>
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>getInput(i,0,rippleTable())}
                points={[
                    [rippleAdder.inputAPos.x,150],
                    rippleAdder.inputAPos,
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>getInput(i,1,rippleTable())}
                points={[
                    [rippleAdder.inputBPos.x,150],
                    rippleAdder.inputBPos,
                ]}
            />
            {(i!=rippleSize-1) && (
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={rippleAdder.carryOut}
                points={[
                    rippleAdder.carryOutPos,
                    [rippleAdder.carryOutPos.x,rippleAdder.carryOutPos.y-20],
                    [rippleAdder.position.x()-rippleSpacing/2,rippleAdder.carryOutPos.y-20],
                    [rippleAdder.position.x()-rippleSpacing/2,rippleAdders[i+1].carryInPos.y],
                    rippleAdders[i+1].carryInPos
                ]}
            />)}
            {(i==rippleSize-1) && (
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={rippleAdder.carryOut}
                points={[
                    rippleAdder.carryOutPos,
                    [rippleAdder.carryOutPos.x,rippleAdder.carryOutPos.y-90],
                ]}
            />)}
            
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={rippleAdder.sum}
                points={[
                    rippleAdder.sumPos,
                    [rippleAdder.sumPos.x,rippleAdder.sumPos.y-90]
                ]}
            />
            <VisualIO
                name={"A"+superInts[i+1]}
                powered={()=>getInput(i,0,rippleTable())}
                position={[rippleAdder.inputAPos.x,150]}
            />
            <VisualIO
                name={"B"+superInts[i+1]}
                powered={()=>getInput(i,1,rippleTable())}
                position={[rippleAdder.inputBPos.x,150]}
            />
            
            {(i==rippleSize-1) && (
            <VisualIO
                name={"Overflow"}
                powered={rippleAdder.carryOut}
                position={[rippleAdder.carryOutPos.x-30,rippleAdder.carryOutPos.y-90]}
            />)}
            <VisualIO
                name={"S"+superInts[i+1]}
                powered={rippleAdder.sum}
                position={[rippleAdder.sumPos.x,rippleAdder.sumPos.y-90]}
            />
        </Layout>
    ))

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
                columnNames={["A¹", "B¹", "Cᶦⁿ", "_", "Sum", "Cᵒᵘᵗ"]}
                columnData={[
                    [0,0,0,"_",0,0],
                    [1,0,0,"_",1,0],
                    [0,1,0,"_",1,0],
                    [0,0,1,"_",1,0],
                    [1,1,0,"_",0,1],
                    [1,0,1,"_",0,1],
                    [1,1,1,"_",1,1],
                ]}
            />
            <TruthTable
                ref={makeRef(truthTables, truthTables.length)}
                position={[-400,0]}
                opacity={0}
                columnNames={["num","binary"]}
                columnData={[
                    ["8","00001001"],
                    ["5","00000101"],
                    ["13","00001110"],
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

            <Layout ref={rippleAdderLayout}>
                {...rippleAdders}
                {...rippleWires}
            </Layout>
            <Layout ref={fullAdderWires} opacity={0}>
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={inputA}
                    points={[
                        [fullAdder.inputAPos.x,150],
                        fullAdder.inputAPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={inputB}
                    points={[
                        [fullAdder.inputBPos.x,150],
                        fullAdder.inputBPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={carryIn}
                    points={[
                        [fullAdder.carryInPos.x+100,fullAdder.carryInPos.y],
                        fullAdder.carryInPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={fullAdder.carryOut}
                    points={[
                        fullAdder.carryOutPos,
                        [fullAdder.carryOutPos.x,fullAdder.carryOutPos.y-90]
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={fullAdder.sum}
                    points={[
                        fullAdder.sumPos,
                        [fullAdder.sumPos.x,fullAdder.sumPos.y-90]
                    ]}
                />
                <VisualIO
                    name={"A¹"}
                    powered={inputA}
                    position={[fullAdder.inputAPos.x,150]}
                />
                <VisualIO
                    name={"B¹"}
                    powered={inputB}
                    position={[fullAdder.inputBPos.x,150]}
                />
                <VisualIO
                    name={"Cᶦⁿ"}
                    powered={carryIn}
                    position={[fullAdder.carryInPos.x+100,fullAdder.carryInPos.y]}
                />
                <VisualIO
                    name={"Cᵒᵘᵗ"}
                    powered={fullAdder.carryOut}
                    position={[fullAdder.carryOutPos.x,fullAdder.carryOutPos.y-90]}
                />
                <VisualIO
                    name={"Sum"}
                    powered={fullAdder.sum}
                    position={[fullAdder.sumPos.x,fullAdder.sumPos.y-90]}
                />
            </Layout>
        </>
    );
    // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
    wires.reverse().forEach(v => v.moveToBottom());
    rippleWires.forEach(v=>v.moveToBottom())
    secondHalfAdderWires().moveToBottom();
    orCarryOutWires().moveToBottom();
    fullAdderWires().moveToBottom();

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
        delay(0.7,fullAdder.opacity(1,1)),
        delay(0.7,slideTitle().text("Full Adder",1)),
    )
    yield* beginSlide("scaled down circuit, reveal FullAdder");
    yield* all(
        truthTables[0].opacity(0,0.5),
        fullAdderWires().opacity(0,0.5),
    )
    // Set first full adders inputs to big nums
    inputA(()=>getInput(0,0,rippleTable()))
    inputB(()=>getInput(0,1,rippleTable()))
    carryIn(false)
    yield* rippleAdderLayout().position.y(200, 1)

    const rippleDelay = 0.2
    yield* all(
        rippleAdderLayout().position.x(rippleSize*rippleSpacing/2-rippleSpacing/4, rippleDelay*(rippleSize-1)),
        ...rippleWires.map((v,i)=>delay(rippleDelay*(i-1),v.opacity(1,1))),
        ...rippleAdders.map((v,i)=>delay(rippleDelay*(i-1),v.opacity(1,1))),
        delay(0.7,slideTitle().text("Ripple Adder",1)),
    )
    yield* beginSlide("ripple adder")
    isRippleAdding(true)
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});