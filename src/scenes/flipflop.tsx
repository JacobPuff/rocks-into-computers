import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt, Node } from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, finishScene, makeRef, range, useLogger} from '@motion-canvas/core/lib/utils';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import { OrGate } from '../basics/or';
import {NotGate} from '../basics/not';
import { HalfAdder } from '../circuits/halfAdder';
import { SRLatch } from '../circuits/srLatch';
import {all, any, waitFor} from '@motion-canvas/core/lib/flow';
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
    const pauseTableSelect = createSignal(false)
    // SR NOR Latch stuff
    const resetGate = createRef<OrGate>();
    const setGate = createRef<OrGate>();
    const rawSRLatch = createRef<Layout>();

    const circuitLayout = createRef<Layout>();
    const tinySRLatchIntroComponents = createRef<Layout>();
    const tinySRLatchOutputs = createRef<Layout>();
    const tinySRLatch = createRef<SRLatch>()
    const tinyDLatch = createRef<GatedDLatch>();
    const tinyDLatchIntroComponents = createRef<Layout>();
    const setValue = createSignal(()=>truthTables[0].outputRow()[0] == 1)
    const resetValue = createSignal(()=>truthTables[0].outputRow()[1] == 1)
    const outputValue = createSignal(()=>truthTables[0].outputRow()[2])

    const getCoupledInput = (table: number, QColumn: number, isSet: boolean) => {
        let data = truthTables[table].columnData()
        let startIdx = truthTables[table].currentOutputLine()
        let idx= startIdx-1
        let log = useLogger()
        let q = 1
        let count = 0
        for (idx; idx != startIdx; idx--) {
            idx = (idx+data.length-1)%(data.length-1)
            if (idx == -1 || data.length == 0){
                break;
            }
            if (idx >= data.length) {
            }
            q = data[idx][QColumn]
            count++
            if (typeof(q) === "number") break;
            if (count > data.length) break; // fiddling failsafe
        }
        switch (outputValue()){
            case "Q":
                if (idx == -1) {
                    return true
                }
                return isSet ? q == 1 : q != 1
            case "X":
                return false
            default:
                return isSet ? outputValue() == 1 : outputValue() != 1
        }
    }
    const resetCoupledInput = createSignal(()=>getCoupledInput(0, 2, false))
    const setCoupledInput = createSignal(()=>getCoupledInput(0, 2, true))

    // D Latch stuff
    const dataValue = createSignal(()=>truthTables[1].outputRow()[0] == 1)
    const resetNotGate = createRef<NotGate>()
    const DLatchInputs = createRef<Layout>()
    const DVisualIO = createRef<VisualIO>()
    const DFlipFlop = createRef<Layout>()
    const DFlipFlopWire = createRef<Node>()
    // Gated D Latch stuff
    const enableValue = createSignal(()=>truthTables[2].outputRow()[1] == 1)
    const gatedDLatch = createRef<Layout>()
    const gatedDLatchWires = createRef<Layout>()
    const resetAndGate = createRef<AndGate>()
    const setAndGate = createRef<AndGate>()
    const enableVisualIO = createRef<VisualIO>()
    

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
            <TruthTable
                ref={makeRef(truthTables, truthTables.length)}
                position={[-500,0]}
                opacity={0}
                columnNames={["S", "R", "Q", "Action"]}
                columnData={[
                    [0,0,"Q", "Hold state"],
                    [0,1, 0,  "Reset"],
                    [0,0,"Q", "Hold state"],
                    [1,0, 1,  "Set"],
                    [0,0,"Q", "Hold state"],
                    [0,1, 0,  "Reset"],
                    [0,0,"Q", "Hold state"],
                    [1,1,"X", "Not allowed"],
                ]}
            />
            <Layout ref={rawSRLatch} opacity={0}>
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
            </Layout>
            
            <Layout ref={circuitLayout} opacity={0}>
                <SRLatch
                    ref={tinySRLatch}
                    rotation={90}
                    set={setValue}
                    reset={resetValue} 
                />
                <Layout ref={tinySRLatchOutputs} opacity={0}>
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={tinySRLatch().output}
                        points={[
                            tinySRLatch().outputPos(), 
                            [tinySRLatch().outputPos().x+100, tinySRLatch().outputPos().y],
                        ]}
                    />
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={tinySRLatch().notOutput}
                        points={[
                            tinySRLatch().notOutputPos(),
                            [tinySRLatch().notOutputPos().x+100, tinySRLatch().notOutputPos().y],
                        ]}
                    />
                    <VisualIO
                        name={"Q"}
                        powered={tinySRLatch().output}
                        position={
                            [tinySRLatch().outputPos().x+100, tinySRLatch().outputPos().y]
                        }
                    />
                    <VisualIO
                        name={"Q̅"}
                        powered={tinySRLatch().notOutput}
                        position={
                            [tinySRLatch().notOutputPos().x+100, tinySRLatch().notOutputPos().y]
                        }
                    />
                </Layout>
            </Layout>
            
            {/* General D flip-flop stuff */}
            <Layout ref={DFlipFlop} opacity={0}>
                <NotGate
                    ref={resetNotGate}
                    inputA={()=>dataValue()}
                    position={[-170, tinySRLatch().resetPos().y]}
                    rotation={90}
                />
                <VisualIO
                    name="D"
                    ref={DVisualIO}
                    position={[-400, tinySRLatch().resetPos().y]}
                    powered={dataValue}
                />
            </Layout>
            {/* Outside of DFlipFlop so it can be put under DLatchInputs, which needs to be under DFlopFlop */}
            <Node
                ref={DFlipFlopWire}
                opacity={()=>DFlipFlop().opacity()}
                position={()=>DFlipFlop().position()}>
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={dataValue}
                    points={[
                        [DVisualIO().position.x(), resetNotGate().inputPos.y],
                        resetNotGate().inputPos,
                    ]}
                />
            </Node>
             
            <Layout ref={DLatchInputs} opacity={0}>
                <TruthTable
                    ref={makeRef(truthTables, truthTables.length)}
                    position={[-550,0]}
                    columnNames={["D", "Q"]}
                    columnData={[
                        [0,0, "Reset"],
                        [1,1, "Set"],
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={dataValue}
                    points={[
                        [DVisualIO().position.x(), resetNotGate().inputPos.y],
                        resetNotGate().inputPos,
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={resetNotGate().output}
                    points={[
                        resetNotGate().outputPos,
                        tinySRLatch().resetPos(),
                    ]}
                />
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={dataValue}
                    jointStart
                    points={[
                        [resetNotGate().inputPos.x-50, resetNotGate().inputPos.y],
                        [resetNotGate().inputPos.x-50, tinySRLatch().setPos().y],
                        tinySRLatch().setPos()
                    ]}
                />
            </Layout>
        </>
    );
    // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
    wires.reverse().forEach(v => v.moveToBottom());
    tinySRLatchOutputs().moveToBottom(); 
    DLatchInputs().moveToBottom();
    DFlipFlopWire().moveToBottom();
    
    const bgAnimateWires = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* all(...wires.map(w=>w.animate()))
    })
    yield* slideTransition(Direction.Right, 1);
    yield* beginSlide("flip flop intro");
    yield* all(
        rawSRLatch().opacity(1,1),
        truthTables[0].opacity(1,1),
        slideTitle().text("SR NOR Latch", 1)
    )
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
    yield* beginSlide("SR NOR Latch raw") 
    yield* all(
        rawSRLatch().opacity(0,1),
        rawSRLatch().scale(0,1),
        delay(0.5, circuitLayout().opacity(1, 1))
    )
    rawSRLatch().remove()
    yield* tinySRLatch().rotation(0,0.5)

    view.add(<Layout ref={tinySRLatchIntroComponents} opacity={0}>
        <Wire
            ref={makeRef(wires, wires.length)}
            powered={resetValue}
            points={[
                [tinySRLatch().resetPos().x, tinySRLatch().resetPos().y+100],
                tinySRLatch().resetPos(),
            ]}
        />
        <Wire
            ref={makeRef(wires, wires.length)}
            powered={setValue}
            points={[
                [tinySRLatch().setPos().x, tinySRLatch().setPos().y+100],
                tinySRLatch().setPos(),
            ]}
        />
        <VisualIO
            name={"R"}
            powered={resetValue}
            position={
                [tinySRLatch().resetPos().x, tinySRLatch().resetPos().y+100]
            }
        />
        <VisualIO
            name={"S"}
            powered={setValue}
            position={
                [tinySRLatch().setPos().x, tinySRLatch().setPos().y+100]
            }
        />
        <Wire
            ref={makeRef(wires, wires.length)}
            powered={tinySRLatch().output}
            points={[
                tinySRLatch().outputPos(),
                [tinySRLatch().outputPos().x, tinySRLatch().outputPos().y-100],
            ]}
        />
        <Wire
            ref={makeRef(wires, wires.length)}
            powered={tinySRLatch().notOutput}
            points={[
                tinySRLatch().notOutputPos(),
                [tinySRLatch().notOutputPos().x, tinySRLatch().notOutputPos().y-100],
            ]}
        />
        <VisualIO
            name={"Q"}
            powered={tinySRLatch().output}
            position={
                [tinySRLatch().outputPos().x, tinySRLatch().outputPos().y-100]
            }
        />
        <VisualIO
            name={"Q̅"}
            powered={tinySRLatch().notOutput}
            position={
                [tinySRLatch().notOutputPos().x, tinySRLatch().notOutputPos().y-100]
            }
        />
    </Layout>)
    tinySRLatchIntroComponents().moveToBottom()
    yield* tinySRLatchIntroComponents().opacity(1,1)

    yield* beginSlide("SR NOR Latch circuit")
    pauseTableSelect(true)
    yield* all(
        tinySRLatch().rotation(90,0.5),
        tinySRLatchIntroComponents().opacity(0,1),
        truthTables[0].opacity(0,1),
    )
    tinySRLatchIntroComponents().remove()
    truthTables[0].remove()

    tinySRLatch().reset(resetNotGate().output)
    tinySRLatch().set(dataValue)
    yield* all(
        DFlipFlop().opacity(1,1),
        DLatchInputs().opacity(1,1),
        tinySRLatchOutputs().opacity(1,1), 
        slideTitle().text("D NOR Latch", 1)
    )
    currentTable(1)
    pauseTableSelect(false)
    yield* beginSlide("D Latch")

    pauseTableSelect(true)
    view.add(
        <TruthTable
            ref={makeRef(truthTables, truthTables.length)}
            opacity={0}
            position={[-600,0]}
            columnNames={["D", "E", "Q"]}
            columnData={[
                [0,0,"Q"],
                [1,0,"Q"],
                [1,1, 1],
                [1,0,"Q"],
                [0,0,"Q"],
                [0,1, 0],
            ]}
        />)
    circuitLayout().add(<>
        <Layout ref={gatedDLatch} opacity={0}>
            <AndGate
                ref={resetAndGate}
                rotation={90}
                position={[-170, tinySRLatch().resetPos().y-25]}
                inputA={resetNotGate().output}
                inputB={enableValue}
            />
            <AndGate
                ref={setAndGate}
                rotation={90}
                position={[-170, tinySRLatch().setPos().y+25]}
                inputA={enableValue}
                inputB={dataValue}
            />
        </Layout>
    </>)
    
    yield* all(
        DLatchInputs().opacity(0,1),
        delay(0.5, circuitLayout().position.x(200,1)),
        delay(0.5,DFlipFlop().position.y(Math.abs(resetNotGate().position.y()-resetAndGate().inputAPos.y)*-1,1)),
    )
    const betweenParents = (point: Vector2, parentFrom: Node, parentTo:Node) => {
        return point.transformAsPoint(parentFrom.localToWorld()).transformAsPoint(parentTo.worldToLocal())
    }
    // Add now that the DFlipFlop components are moved
    circuitLayout().add(<>
        <VisualIO
            name={"Enable"}
            ref={enableVisualIO}
            position={[
                betweenParents(DVisualIO().position(), DFlipFlop(), circuitLayout()).x,
                0
            ]}
            opacity={0}
            powered={enableValue}
        />
        <Layout ref={gatedDLatchWires} opacity={0}>
            {/* AND to SR Latch */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={resetAndGate().output}
                points={[
                    resetAndGate().outputPos,
                    [resetAndGate().outputPos.x-((resetAndGate().outputPos.x-tinySRLatch().resetPos().x)/2), resetAndGate().outputPos.y],
                    [resetAndGate().outputPos.x-((resetAndGate().outputPos.x-tinySRLatch().resetPos().x)/2), tinySRLatch().resetPos().y],
                    tinySRLatch().resetPos(),
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={setAndGate().output}
                points={[
                    setAndGate().outputPos,
                    [setAndGate().outputPos.x-((setAndGate().outputPos.x-tinySRLatch().setPos().x)/2), setAndGate().outputPos.y],
                    [setAndGate().outputPos.x-((setAndGate().outputPos.x-tinySRLatch().setPos().x)/2), tinySRLatch().setPos().y],
                    tinySRLatch().setPos(),
                ]}
            />
            {/* gated D inputs */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={resetNotGate().output}
                points={[
                    betweenParents(resetNotGate().outputPos, DFlipFlop(), circuitLayout()), 
                    resetAndGate().inputAPos,
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={dataValue}
                jointStart
                points={[
                    [betweenParents(resetNotGate().inputPos, DFlipFlop(), circuitLayout()).x-50, betweenParents(resetNotGate().inputPos, DFlipFlop(), circuitLayout()).y],
                    [betweenParents(resetNotGate().inputPos, DFlipFlop(), circuitLayout()).x-50, setAndGate().inputBPos.y],
                    setAndGate().inputBPos
                ]}
            />
            {/* enable inputs */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={enableValue}
                points={[
                    [enableVisualIO().position.x()+250, enableVisualIO().position.y()],
                    [enableVisualIO().position.x()+250, resetAndGate().inputBPos.y],
                    resetAndGate().inputBPos
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={enableValue}
                points={[
                    [enableVisualIO().position.x()+250, enableVisualIO().position.y()],
                    [enableVisualIO().position.x()+250, setAndGate().inputAPos.y],
                    setAndGate().inputAPos
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={enableValue}
                jointEnd
                points={[
                    enableVisualIO().position(),
                    [enableVisualIO().position.x()+250, enableVisualIO().position.y()],
                ]}
            />
        </Layout>
    </>)
    gatedDLatchWires().moveToBottom();
    DFlipFlopWire().moveToBottom(); // Doing this again so the d flip flop wire goes below gatedDLatchWires
    tinySRLatch().reset(resetAndGate().output)
    tinySRLatch().set(setAndGate().output)
    dataValue(()=>truthTables[2].outputRow()[0] == 1)
    resetNotGate().inputA(dataValue)
    yield* all(
        enableVisualIO().opacity(1,1),
        truthTables[2].opacity(1,1),
        gatedDLatch().opacity(1,1),
        gatedDLatchWires().opacity(1,1),
        slideTitle().text("Gated D Latch", 1)
    )
    currentTable(2)
    pauseTableSelect(false)
    yield* beginSlide("Gated D Latch raw")
    DFlipFlopWire().reparent(circuitLayout())
    DFlipFlop().reparent(circuitLayout())
    
    view.add(<>
        <GatedDLatch
            ref={tinyDLatch}
            opacity={0}
            position={[150,0]}
            rotation={90}
            data={dataValue}
            enable={enableValue}
        />
    </>)
    yield* all(
        circuitLayout().opacity(0,1),
        circuitLayout().scale(0,1),
        delay(0.5,tinyDLatch().opacity(1,1)),
    )
    yield* all(
        tinyDLatch().rotation(0,1),
        tinyDLatch().position.x(0,1),
    )
    circuitLayout().remove()
    view.add(<>
        <Layout ref={tinyDLatchIntroComponents} opacity={0}>
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={dataValue}
                points={[
                    [tinyDLatch().dataPos().x, tinyDLatch().dataPos().y+100],
                    tinyDLatch().dataPos(),
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={enableValue}
                points={[
                    [tinyDLatch().enablePos().x, tinyDLatch().enablePos().y+100],
                    tinyDLatch().enablePos(),
                ]}
            />
            
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={tinyDLatch().output}
                points={[
                    tinyDLatch().outputPos(),
                    [tinyDLatch().outputPos().x, tinyDLatch().outputPos().y-100],
                ]}
            />
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={tinyDLatch().notOutput}
                points={[
                    tinyDLatch().notOutputPos(),
                    [tinyDLatch().notOutputPos().x, tinyDLatch().notOutputPos().y-100],
                ]}
            />
            <VisualIO
                name={"D"}
                position={[tinyDLatch().dataPos().x, tinyDLatch().dataPos().y+100]}
                powered={dataValue}
            />
            <VisualIO
                name={"E"}
                position={[tinyDLatch().enablePos().x, tinyDLatch().enablePos().y+100]}
                powered={enableValue}
            />
            <VisualIO
                name={"Q"}
                powered={tinyDLatch().output}
                position={
                    [tinyDLatch().outputPos().x, tinyDLatch().outputPos().y-100]
                }
            />
            <VisualIO
                name={"Q̅"}
                powered={tinyDLatch().notOutput}
                position={
                    [tinyDLatch().notOutputPos().x, tinyDLatch().notOutputPos().y-100]
                }
            />
        </Layout>
    </>)
    tinyDLatchIntroComponents().moveToBottom()
    yield* tinyDLatchIntroComponents().opacity(1,1)
    yield* beginSlide("Gated D Latch circuit")
    
    finishScene();
    yield* waitFor(1);
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});