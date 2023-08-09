import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt, Node } from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, makeRef, range, useLogger} from '@motion-canvas/core/lib/utils';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import { OrGate } from '../basics/or';
import {NotGate} from '../basics/not';
import { HalfAdder } from '../circuits/halfAdder';
import { SRLatch } from '../circuits/srLatch';
import {all, any, noop, waitFor} from '@motion-canvas/core/lib/flow';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {Direction, PossibleVector2, Vector2} from '@motion-canvas/core/lib/types';
import { loop, delay } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { Signal, SimpleSignal, createSignal, SignalValue } from '@motion-canvas/core/lib/signals';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 
import { AndGate } from '../basics/and';
import { GatedDLatch } from '../circuits/gatedDLatch';

export default makeScene2D(function* (view) {
    const slideTitle = createRef<Txt>();
    const truthTables: TruthTable[] = []
    const currentTable = createSignal(0)
    const pauseTableSelect = createSignal(true)
    const superInts = "⁰¹²³⁴⁵⁶⁷⁸⁹"
    let log = useLogger()

    view.add(
    <>
        
        <TruthTable
            ref={makeRef(truthTables, truthTables.length)}
            position={[-650,-100]}
            opacity={0}
            columnNames={["Data"]}
            columnData={[
                ["0000"],
                ["1010"],
            ]}
        />
        <TruthTable
                ref={makeRef(truthTables, truthTables.length)}
                position={[-650,-100]}
                opacity={0}
                columnNames={["Data", "Load"]}
                columnData={[
                    ["0000", true],
                    ["0000", false],
                    ["1010", false],
                    ["1010", true],
                    ["0010", true],
                    ["0010", false],
                    ["0000", false],
                ]}
            />
    </>)
    const wires: Wire[] = [];
    const wireLayouts: Record<string, Wire> = {};
    const circuitLayout = createRef<Layout>();
    const dLatches: GatedDLatch[] = [];
    const dataInputs = createSignal(()=>{
        // if (truthTables.length == 0) {
        //     return [0,0,0,0]
        // }
        var input = truthTables[currentTable()].outputRow()[0].split("")
        return input || [0,0,0,0]
    })
    const dataInputsNode = createRef<Node>();
    const clock = createRef<VisualIO>();
    const load = createRef<VisualIO>();
    const loadGatesNode = createRef<Node>();
    const orGates: OrGate[] = [];
    const notGates: NotGate[] = [];
    const andGates: Record<string, AndGate> = {};

    let storedValuesRaw: number[] = [0,0,0,0]
    let foo = false
    let storedValues = storedValuesRaw.map(v => createSignal(v))
    const storeLooped = ()=> {
        if (dLatches.length != 0) {
            dLatches.forEach((latch, idx)=>{
                storedValuesRaw[idx]=latch.output()?1:0
            })
        }
        /**
         * storedValues is an array of signals because just using an array
         * will use a shallow comparison and everything using it won't get updated.
         * 
         * We use storedValuesRaw as an intermediary point so signal updates are stopped here.
        */
        storedValuesRaw.map((v,i)=> storedValues[i](v))
    }
    storeLooped()

    const latchSpacing = createSignal(300)
    const latchCount = dataInputs().length
    const GatedDLatchWidth = 150
    const halfRegisterWidth = createSignal(()=>(latchSpacing()*(latchCount-2)/2)+(GatedDLatchWidth/2))
    const clockYOffset = 100
    const loadYOffset = 430
    const dataYOffset = 400
    const loadAndSpacing = 70
    const clockHz = 4
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
                text={"Storing a value"}
            />
            <Layout ref={circuitLayout} opacity={0} x={200}>
                
                {/* Clock IO */}
                <VisualIO
                    ref={clock}
                    x={()=>-halfRegisterWidth()-300}
                    y={clockYOffset}
                    name={"Clock"}
                    powered={false}
                />
                {/* Data inputs stuff */}
                {range(latchCount).map(idx=>
                    <GatedDLatch
                        x={()=>(idx*latchSpacing()-halfRegisterWidth() )}
                        ref={makeRef(dLatches, dLatches.length)}
                        data={()=>dataInputs()[idx]==1}
                        enable={()=>clock().powered() || true}
                    />
                )}
                <Layout ref={makeRef(wireLayouts, "initialDLatchWiresAndOutIO")}>
                    {dLatches.map((latch, idx)=>
                        <>
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                powered={()=>dataInputs()[idx]==1}
                                points={[
                                    [latch.dataPos().x, dataYOffset],
                                    latch.dataPos(),
                                ]}
                            />
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                powered={latch.output}
                                points={[
                                    latch.outputPos(),
                                    [latch.outputPos().x, latch.outputPos().y-100],
                                ]}
                            />
                            <VisualIO
                                name={"Out"+superInts[dLatches.length-idx]}
                                powered={latch.output}
                                position={[latch.outputPos().x, latch.outputPos().y-100]}
                            />
                        </>
                    )}
                </Layout>
                <Node ref={dataInputsNode}>
                    {dLatches.map((latch, idx)=>
                        <VisualIO
                            name={"D"+superInts[dLatches.length-idx]}
                            position={[latch.dataPos().x, dataYOffset]}
                            powered={()=>dataInputs()[idx]==1}
                        />
                    )}
                </Node>
                {/* Clock Wires */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={clock().powered}
                    points={[
                        clock().position(),
                        [dLatches[dLatches.length-1].enablePos().x, clockYOffset],
                    ]}
                />
                {dLatches.map(latch=>
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={clock().powered}
                        jointStart
                        points={[
                            [latch.enablePos().x, clockYOffset],
                            latch.enablePos(),
                        ]}
                    />
                )}

                {/* Load signal */}
                <Node ref={loadGatesNode} opacity={0}>
                    <VisualIO
                        ref={load}
                        x={()=>clock().position.x()}
                        y={loadYOffset}
                        name={"Load"}
                        powered={false}
                    />
                    {dLatches.map((latch, idx)=><Node>
                            <OrGate
                                ref={makeRef(orGates, idx)}
                                scale={0.7}
                                position={[latch.dataPos().x, latch.dataPos().y+120]}
                                inputA={()=>andGates[idx+"A"]?.output() || false}
                                inputB={()=>andGates[idx+"B"]?.output() || false}
                            />
                            <AndGate
                                ref={makeRef(andGates, idx+"A")}
                                scale={0.7}
                                inputA={()=>(storedValues[idx]() == 1)}
                                inputB={()=>!load().powered()}
                                position={[orGates[idx].inputAPos.x, orGates[idx].inputAPos.y+55]}
                            />
                            <AndGate
                                ref={makeRef(andGates, idx+"B")}
                                scale={0.7}
                                position={[orGates[idx].inputBPos.x+loadAndSpacing, orGates[idx].inputBPos.y+55]}
                                inputA={load().powered}
                                inputB={()=>dataInputs()[idx]==1}
                            />
                            <NotGate
                                ref={makeRef(notGates, idx)}
                                scale={0.7}
                                inputA={load().powered}
                                position={[andGates[idx+"A"].inputBPos.x, andGates[idx+"A"].inputBPos.y+70]}
                            />
                    </Node>)}
                </Node>
            </Layout>
        </>
    );
    // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
    wires.reverse().forEach(v => v.moveToBottom());
    Object.values(wireLayouts).forEach(v=> v.moveToBottom());
    
    load().powered(()=> truthTables[currentTable()].outputRow()[1])
    const bgAnimateWires = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* all(...wires.map(w=>w.animate()))
    })
    
    const bgSelectRows = yield loop(sizes.LOOP_LENGTH, function* (){
        if(pauseTableSelect()){
            yield* waitFor(1)
            return
        }
        let table = truthTables[currentTable()]
        let nextRow = (table.currentOutputLine()+1) % table.columnData().length
        yield* table.select(nextRow, sizes.TRUTH_TABLE_DEFAULT_SPEED)
        yield* waitFor(1)
        
    })
    yield* slideTransition(Direction.Right, 1);
    yield* beginSlide("storing a value intro");
    yield* all(
        circuitLayout().opacity(1,1),
        truthTables[0].opacity(1,1),
    )
    pauseTableSelect(false)
    const bgRunClock = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* waitFor(1/clockHz/2)
        clock().powered(!clock().powered())
        storeLooped() // reading stored signal so it may be updated
    })
    yield* beginSlide("Load signal")
    
    pauseTableSelect(true)
    yield* all(
        circuitLayout().position.y(-100,1),
        ...dataInputsNode().children().map((v,i)=>v.position([andGates[i+"B"].inputBPos.x, dataYOffset+100], 1)),
        wireLayouts.initialDLatchWiresAndOutIO.opacity(0,1),
        truthTables[0].opacity(0,1),
    )
    wireLayouts.initialDLatchWiresAndOutIO.remove()
    truthTables[0].remove()
    circuitLayout().add(
        
        <Layout ref={makeRef(wireLayouts, "loadSignalWires")} opacity={0}>
        <Wire
            ref={makeRef(wires, wires.length)}
            powered={load().powered}
            points={[
                load().position(),
                [andGates[(dLatches.length-1)+"B"].inputAPos.x, loadYOffset],
            ]}
        />
        {dLatches.map((latch, idx)=><Node>
            {/* Load to AND */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={load().powered}
                jointStart
                points={[
                    [notGates[idx].inputPos.x, loadYOffset],
                    notGates[idx].inputPos,
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={notGates[idx].output}
                points={[
                    notGates[idx].outputPos,
                    andGates[idx+"A"].inputBPos,
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={load().powered}
                jointStart
                points={[
                    [andGates[idx+"B"].inputAPos.x, loadYOffset],
                    andGates[idx+"B"].inputAPos,
                ]}
            />
            
            {/* AND to OR */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={andGates[idx+"A"].output}
                points={[
                    andGates[idx+"A"].outputPos,
                    orGates[idx].inputAPos,
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={andGates[idx+"B"].output}
                points={[
                    andGates[idx+"B"].outputPos,
                    [andGates[idx+"B"].outputPos.x, andGates[idx+"B"].outputPos.y-(andGates[idx+"B"].outputPos.y-orGates[idx].inputBPos.y)/2],
                    [orGates[idx].inputBPos.x, andGates[idx+"B"].outputPos.y-(andGates[idx+"B"].outputPos.y-orGates[idx].inputBPos.y)/2],
                    orGates[idx].inputBPos
                ]}
            />
            {/* OR to flip-flop */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={orGates[idx].output}
                points={[
                    orGates[idx].outputPos,
                    latch.dataPos(),
                ]}
            />
            
            {/* Feedback signal */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>storedValues[idx]()==1}
                points={[
                    latch.outputPos(),
                    [latch.outputPos().x,latch.outputPos().y-30],
                    [latch.outputPos().x-57,latch.outputPos().y-30],
                    [latch.outputPos().x-57,andGates[idx+"A"].inputAPos.y+30],
                    [andGates[idx+"A"].inputAPos.x,andGates[idx+"A"].inputAPos.y+30],
                    andGates[idx+"A"].inputAPos
                ]}
            />
            
            {/* Data signal */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>dataInputs()[idx] == 1}
                points={[
                    dataInputsNode().children()[idx].position(),
                    andGates[idx+"B"].inputBPos
                ]}
            />
            
        </Node>
        )}
    </Layout>
    )
    wireLayouts["loadSignalWires"].moveToBottom()
    yield* all(
        loadGatesNode().opacity(1,1),
        wireLayouts["loadSignalWires"].opacity(1,1),
        truthTables[1].opacity(1,1)
    )
    dLatches.forEach((latch,i)=> latch.data(orGates[i].output))
    storeLooped()
    currentTable(1)
    pauseTableSelect(false)

    yield* waitFor(5)
    yield* beginSlide("next")
    yield* beginSlide("end")
    cancel(bgAnimateWires);
    cancel(bgRunClock);
    cancel(bgSelectRows);
});