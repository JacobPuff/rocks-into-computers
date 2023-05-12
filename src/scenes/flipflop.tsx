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
import { Signal, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
    const slideTitle = createRef<Txt>();
    const truthTables: TruthTable[] = []
    const resetGate = createRef<OrGate>();
    const setGate = createRef<OrGate>();
    const SRLatch = createRef<Layout>();
    
    const setValue = createSignal(()=>truthTables[0].outputRow()[0] == 1)
    const resetValue = createSignal(()=>truthTables[0].outputRow()[1] == 1)
    const outputValue = createSignal(()=>truthTables[0].outputRow()[2])
    const resetCoupledInput = createSignal(()=>{
        var idx = truthTables[0].currentOutputLine()-1
        switch (outputValue()){
            case "Q":
                return idx < 0 ? true :truthTables[0].columnData()[idx][2] != 1
            case "X":
                return false
            default:
                return !(outputValue() == 1)
        }
    })
    const setCoupledInput = createSignal(true)
    setCoupledInput(()=>{
        var idx = truthTables[0].currentOutputLine()-1
        switch (outputValue()){
            case "Q":
                return idx < 0 ? true : truthTables[0].columnData()[idx][2] == 1
            case "X":
                return false
            default:
                return outputValue() == 1
        }
    })

    const wires: Wire[] = [];
    const outputDist = 200
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
                text={"Storing a bit"}
            />
            <Layout ref={SRLatch} opacity={0}>
                <TruthTable
                    ref={makeRef(truthTables, truthTables.length)}
                    position={[-500,0]}
                    columnNames={["S", "R", "Q", "Action"]}
                    columnData={[
                        [0,0,"Q", "Hold state"],
                        [0,1, 0,  "Reset"],
                        [0,0,"Q", "Hold state"],
                        [1,0, 1,  "Set"],
                        [0,0,"Q", "Hold state"],
                        [0,1, 0,  "Reset"],
                        [1,1,"X", "Not allowed"],
                    ]}
                />
                <OrGate
                    isNOR
                    ref={resetGate}
                    position={[0, -100]}
                    rotation={90}
                    inputA={resetValue}
                    inputB={resetCoupledInput}
                />
                <OrGate
                    isNOR
                    ref={setGate}
                    position={[0, 100]}
                    rotation={90}
                    inputA={setCoupledInput}
                    inputB={setValue}
                />
                {/* Input wires */}
                
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={resetValue}
                    points={[
                        [resetGate().inputAPos.x-150, resetGate().inputAPos.y],
                        resetGate().inputAPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={setValue}
                    points={[
                        [setGate().inputBPos.x-150, setGate().inputBPos.y],
                        setGate().inputBPos,
                    ]}
                />
                <VisualIO
                    name={"R"}
                    powered={resetValue}
                    position={
                        [resetGate().inputAPos.x-150, resetGate().inputAPos.y]
                    }
                />
                <VisualIO
                    name={"S"}
                    powered={setValue}
                    position={
                        [setGate().inputBPos.x-150, setGate().inputBPos.y]
                    }
                />
                {/* Output wires */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={resetGate().output}
                    points={[
                        resetGate().outputPos,
                        [resetGate().outputPos.x+outputDist, resetGate().outputPos.y],
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={setGate().output}
                    points={[
                        setGate().outputPos,
                        [setGate().outputPos.x+outputDist, setGate().outputPos.y],
                    ]}
                />
                <VisualIO
                    name={"Q"}
                    powered={resetGate().output}
                    position={
                        [resetGate().outputPos.x+outputDist, resetGate().outputPos.y]
                    }
                />
                <VisualIO
                    name={"Q̅"}
                    powered={setGate().output}
                    position={
                        [setGate().outputPos.x+outputDist, setGate().outputPos.y]
                    }
                />
                {/* Cross-coupled wires */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={resetGate().output}
                    jointStart
                    points={[
                        [resetGate().outputPos.x+(outputDist/2), resetGate().outputPos.y],
                        [resetGate().outputPos.x+(outputDist/2), resetGate().outputPos.y+50],
                        [setGate().inputAPos.x-70, setGate().inputAPos.y-50],
                        [setGate().inputAPos.x-70, setGate().inputAPos.y],
                        setGate().inputAPos
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={setGate().output}
                    jointStart
                    points={[
                        [setGate().outputPos.x+(outputDist/2), setGate().outputPos.y],
                        [setGate().outputPos.x+(outputDist/2), setGate().outputPos.y-50],
                        [resetGate().inputBPos.x-70, resetGate().inputBPos.y+50],
                        [resetGate().inputBPos.x-70, resetGate().inputBPos.y],
                        resetGate().inputBPos
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
    yield* beginSlide("flip flop intro");
    yield* all(
        SRLatch().opacity(1,1),
        slideTitle().text("SR NOR Latch", 1)
    )
    const bgSelectRows = yield loop(10000, function* (){
        yield* all (
            ...truthTables.map(table=>{
                let nextRow = (table.currentOutputLine()+1) % table.columnData().length
                return table.select(nextRow, sizes.TRUTH_TABLE_DEFAULT_SPEED)
            })
        )
        yield* waitFor(1)
        
    })
    yield* beginSlide("SR NOR Latch")
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});