import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Rect, Txt, Node } from '@motion-canvas/2d/lib/components';
import {Reference, beginSlide, createRef, makeRef, range, useLogger} from '@motion-canvas/core/lib/utils';
import { NotGate } from '../basics/not';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { NBitRegister } from '../circuits/nBitRegister';
import { Decoder } from '../circuits/decoder';
import { FullAdder } from '../circuits/fullAdder';
import { PossibleVector2 } from '@motion-canvas/core/lib/types';
import { TruthTable } from '../basics/truthtable';
import {all, waitFor} from '@motion-canvas/core/lib/flow';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {Direction, Vector2} from '@motion-canvas/core/lib/types';
import { loop, delay } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 
import { easeInCubic } from '@motion-canvas/core/lib/tweening';
import { AndGate } from '../basics/and';

export default makeScene2D(function* (view) {
    const slideTitle = createRef<Txt>();
    view.fill(colors.BACKGROUND_COLOR);
    const superInts = "⁰¹²³⁴⁵⁶⁷⁸⁹"

    const wires: Wire[] = [];
    const wireLayouts: Record<string, Layout> = {};
    const moveWiresToBottom = () => {
        // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
        wires.reverse().forEach(v => v.moveToBottom());
        Object.values(wireLayouts).forEach(v=> v.moveToBottom());
    }


    /**
     * Control signals
     */
    // Clock
    const clockEnable = createSignal(false); // Start and stop the computer. Useful for testing as well.
    const haltEnable = createSignal(false); // Just for stopping
    // Program Counter
    const programCounterOut = createSignal(false); // Output program counter value to bus
    const programCounterIn = createSignal(false); // Change program counter value from bus, used for jumping
    const counterEnable = createSignal(false); // Enables program counter changing
    // RAM
    const memoryRegisterIn = createSignal(false); // Sets memory register value to where in RAM we are reading from
    const ramOut = createSignal(false); // Outputs ram from wherever memory register is set to
    const ramIn = createSignal(false); // Write value to ram at whatever address memory register is set to
    const ramInAvailable = createSignal(false); // This isn't a control signal, but we'll use it to not re-draw the RAM every clock cycle when ramIn is on
    // General Registers
    const aRegisterIn = createSignal(false);
    const aRegisterOut = createSignal(false);
    const bRegisterIn = createSignal(false);
    const bRegisterOut = createSignal(false);
    // Instructions
    const instructionRegisterIn = createSignal(false); // Set intrusction register to so we can control our other control signals
    const instructionRegisterOut = createSignal(false); // Output instruction values to bus (not including instruction)
    // Adder Signals
    const enableAdder = createSignal(false); // Enables inputs from A and B registers, and writing to Sum register
    const enableSumOut = createSignal(false); // Not a register, just enables the output
    const didOverflow = createSignal(false); // used for conditional jumps

    /**
     * Configs and maps
     */
    const controlSignalNameList = [
        "PCI",
        "PCO",
        "PCE",
        "MRI",
        "RVI",
        "RVO",
        "IRI",
        "IRO",
        "ARI",
        "ARO",
        "BRI",
        "BRO",
        "EA",
        "SRO",
        "HE",
    ]
    const controlSignalMap: {[key:string]: SimpleSignal<boolean, void>} = {
        "PCI": programCounterIn,
        "PCO": programCounterOut,
        "PCE": counterEnable,
        "MRI": memoryRegisterIn,
        "RVI": ramIn,
        "RVO": ramOut,
        "IRI": instructionRegisterIn,
        "IRO": instructionRegisterOut,
        "ARI": aRegisterIn,
        "ARO": aRegisterOut,
        "BRI": bRegisterIn,
        "BRO": bRegisterOut,
        "EA": enableAdder,
        "SRO": enableSumOut,
        "HE": haltEnable,
    }
    const lazyLoadingFixes: {[key:string]: Function} = {
        "PCI": ()=>programCounter().output(),
        // "PCO": ,
        // "PCE": ,
        "MRI": ()=>memRegister().output(),
        // "RVI": ,
        // "RVO": ()=>busSignals.map(v=>v()), // Dunno about this one.
        "IRI": ()=>instructionRegister().output(),
        // "IRO": ,
        "ARI": ()=>aRegister().output(),
        // "ARO": ,
        "BRI": ()=>bRegister().output(),
        // "BRO": ,
        "EA": ()=>{
            sumRegister().output()
            flagsRegister().output()
        },
        // "SRO": ,
        // "HE": ,
    }

    const commonMicroCode = [
        "PCO MRI",
        "RVO IRI PCE",
    ]
    const commonMicroCodeSplit = commonMicroCode.map(s=>s.split(" "))
    // Does not include MOV or JMPC, since those are more custom.
    const basicInstrToMicroCode: {[key: string]: string[]} = {
        "LOADA": [
            "IRO MRI",
            "RVO ARI",
        ],
        "LOADB": [
            "IRO MRI",
            "RVO BRI",
        ],
        "SETA": [
            "IRO ARI",
        ],
        "STOREA": [
            "IRO MRI",
            "ARO RVI"
        ],
        "STORETB": [
            "BRO MRI",
            "ARO RVI"
        ],
        "ADD": [
            "EA",
            "SRO ARI"
        ],
        "JMP": [
            "IRO PCI"
        ],
        "HALT": ["HE"],
    }
    const jmpcMicroCode = ["IRO", "PCI"]
    const instructionMap = [
        "NOOP",    // does nothing
        "LOADA",   // set A reg to value from mem addr $N
        "LOADB",   // set B reg to value from mem addr $N
        "SETA",    // set A reg directly to constant
        "STOREA",  // store A reg value to mem addr $N
        "STORETB",  // store A to address in B reg
        "MOV",     // Copy data from $R1 to $R2
        "ADD",     // Adds the A and B registers, storing in A reg
        "JMP",     // sets program counter to $N
        "JMPC",    // sets program counter to $N if the carry flag is true
        "HALT",    // pauses clock
    ]

    const movSignals = ["PCO", "BRO", "ARO",  "MRI","PCI","BRI","ARI"]
    // Should match registerNameMap 
    const movRegBitMap: {[key: string]: number} = {
        "PCO":1,
        "BRO":2,
        "ARO":3,
        "MRI":4,
        "PCI":5,
        "BRI":6,
        "ARI":7,
    }
    // Registers are multiples of two so you can do things like MOV A to both B and M
    const registerNameMap: {[key: string]: number} = {
        "A": 1,
        "B": 2,
        "P": 4,
        "M": 8,
    }

    const assembler = (line: string, from: string ='null'): string => {
        let splitLine = line.split(" ")
        if (splitLine.length > 2 && !line.includes("MOV") || splitLine.length > 3) {
            log.error("Too many spaces in line: "+ JSON.stringify(splitLine))
        }
        let parsed = line
        instructionMap.forEach((v, i)=>{
            if (splitLine[0].includes(v)) {
                if (v == "MOV") {
                    parsed = i.toString(2).padStart(bits, '0') + ' ' +
                    registerNameMap[splitLine[1]].toString(2).padStart(bits/2, '0')+
                    registerNameMap[splitLine[2]].toString(2).padStart(bits/2, '0')
                    return
                }
                parsed = i.toString(2).padStart(bits, '0') + ' ' + (splitLine.length == 2 ? parseInt(splitLine[1]).toString(2).padStart(bits, '0') : '0'.repeat(bits))
            }
        })
        return parsed
    }

    view.add(
        <>
            <Txt
                ref={slideTitle}
                position={[0,-300]}
                fontSize={50}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"Putting it all together"}
            />
        </>
    );

    let log = useLogger()
    yield* slideTransition(Direction.Right, 1);
    yield* beginSlide("cpu intro");

    const bits = 8 // This shouldn't change, because of instructions possibly getting screwed up if it does
    const miniatureScale = 0.5 // What size to scale down to after viewing (originally intended to allow scaling the whole CPU, but I didn't use this on the positions...)
    const registerMini = 0.2 // On top of the miniatureScale
    const rippleMini = 0.23 // On top of the miniatureScale
    const controlLogicMini = 0.05 // On top of the miniatureScale
    const backgroundOpacity = createSignal(0) //Used to fade everything in the background
    let clockHz = 3
    let clockSeconds = 1/clockHz/2

    /**
     * Spacing
     */
    const busYPos = -450;
    const generalBusDistance = 300 // just sorta winging this, but should keep things semi consistent
    const registerNodeYPos = 50;
    const rippleNodeYPos = -220;
    const rippleExtraXDist = 100;
    const rippleWireXOffset = 65
    const sumRegisterNodeYPos = -390;
    const programCounterNodeYPos = -400;
    const clockYPos = -480;
    const clockExtraXDist = 150;
    const ramNodeYPos = -200;
    const ramExtraXDist = 325;
    const memRegisterNodeYPos = ramNodeYPos-55;
    const instructionRegisterNodeYPos = 40;
    const controlLogicYPos = 300;
    const controlLogicExtraXDist = 220;
    const microCounterNotClockOffsetX = -490;
    const flagsRegisterNodeYPos = rippleNodeYPos-110;
    const flagsRegisterExtraXDist = rippleExtraXDist+300;

    /**
     * Bus
     */
    const busLayout = createRef<Layout>();
    
    var busBuffer = range(bits).map(v=>"0").join('') // Avoiding circular dependencies
    const busUpdated = createSignal(false) // Used to force updates for things reading busBuffer
    const busSignals = range(bits).map(v => createSignal(0));
    const busHeight = 1200
    const busWireSpacing = 50;
    const busWirePos = (i: number) => {
        return i * busWireSpacing 
    }
    view.add(
        <>
            <Layout
                ref={busLayout}
                width={400}
                opacity={backgroundOpacity}
                position={[-200, busYPos]}
            >
                {range(bits).map((i)=>
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={()=>busSignals[i]() == 1}
                        jointStart
                        jointEnd
                        isSolid
                        points={[
                            [busWirePos(i), 0],
                            [busWirePos(i), busHeight]
                        ]}
                    />
                )}
            </Layout>
        </>
    )
    moveWiresToBottom()

    yield* all(
        slideTitle().position.x(-350,1),
        slideTitle().text("The Bus",1),
        delay(0.5, backgroundOpacity(1,1))
    )
    busSignals[0](1)
    busSignals[1](1)
    busSignals[2](1)
    busSignals[3](1)

    yield* beginSlide('bus')
    
    yield* all(
        busLayout().scale(miniatureScale,1),
        busLayout().position.x(busLayout().position.x()*miniatureScale,1)
    )
    yield* all(
        slideTitle().opacity(0,0.5),
        backgroundOpacity(0,0.5)
    )
    busSignals[0](0)
    busSignals[1](0)
    busSignals[2](0)
    busSignals[3](0)

    busSignals.map((v,i)=>v(()=>{
        let val = false
        if(aRegisterOut()){
            val = val || aRegister().output()[i] == "1"
        }
        if(bRegisterOut()){
            val = val || bRegister().output()[i] == "1"
        }
        if(enableSumOut()){
            val = val || sumRegister().output()[i] == "1"
        }
        if(ramOut()){
            let addr = parseInt(memRegister().output(), 2)
            let line = ramTable().columnData()[addr][2]
            let parsed = assembler(line)
            val = val || parsed[parsed.length-bits+i] == "1"
        }
        if (programCounterOut()){
            let output = programCounter().output()
            val = val || output[i] == "1"
        }
        if(instructionRegisterOut()){
            let output = instructionRegister().output().slice(bits)
            val = val || output[i] == "1"
        }
        let num = val ? 1 : 0
        busBuffer = busBuffer.slice(0,i) + num.toString() + busBuffer.slice(i+1)
        return num
    }))
    
    /**
     * End Bus
     */

    /**
     * A and B Resgisters
     */
    const abRegisterHeight = 700
    const aRegister = createRef<NBitRegister>();
    const bRegister = createRef<NBitRegister>();
    const registerNode= createRef<Node>();
    const aRect = createRef<Rect>();
    const bRect = createRef<Rect>();
    const aRectInternals = createRef<Node>();
    const bRectInternals = createRef<Node>();
    const generateRegisterBlock = (
        xPos: number,
        name: string,
        loadSig: SimpleSignal<boolean>,
        rectRef:Reference<Rect>,
        insideRef:Reference<Node>,
        regRef: Reference<NBitRegister>) => {
        return <>
        
            <Rect
                ref={rectRef}
                position={[xPos,0]}
                width={715}
                height={abRegisterHeight}
                lineWidth={5}
                stroke={colors.TEXT_COLOR}
                radius={10}
            >
                <Txt
                    offset={[0,-1]}
                    position={[0,-abRegisterHeight/2+15]}
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={`Register ${name}`}
                />
                <NBitRegister
                    position={[100,100]}
                    ref={regRef}
                    numBits={bits}
                    input={()=>loadSig() && busBuffer}
                    load={loadSig}
                />
                <Node ref={insideRef} position={[0,0]}>
                    {/* In */}
                    {range(bits).map(v=>
                        <Wire
                            ref={makeRef(wires, wires.length)}
                            jointStart
                            points={[
                                [regRef().getInputPos(v).x,300],
                                regRef().getInputPos(v)
                            ]}
                        />
                    )}
                    {/* Out */}
                    {range(bits).map(v=>
                        <Wire
                            ref={makeRef(wires, wires.length)}
                            jointEnd
                            points={[
                                regRef().getOutputPos(bits-v-1),
                                [regRef().getOutputPos(bits-v-1).x,-90-+v*17],
                                [-300,-90-v*17],
                            ]}
                        />
                    )}
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        powered={true}
                        points={[
                            [100,230],
                            [-150,230],
                            [-150,100],
                            [100,100]
                        ]}
                    />
                    <VisualIO
                        position={[100,230]}
                        powered={true}
                        name={`Enable ${name} Register In`}
                    />
                    <VisualIO
                        position={[-150,100]}
                        powered={true}
                        name={'Load'}
                    />
                    
                    <VisualIO
                        position={[100,-10]}
                        powered={false}
                        name={`Enable ${name} Register Out`}
                    />
                </Node>
            </Rect>
        </>
    }
    view.add(
        <>
            <Node ref={registerNode} opacity={0}>
                {generateRegisterBlock(-400,"A", aRegisterIn, aRect, aRectInternals, aRegister)}
                {generateRegisterBlock(400, "B", bRegisterIn, bRect, bRectInternals, bRegister)}
            </Node>
        </>
    )
    aRectInternals().moveToBottom()
    bRectInternals().moveToBottom()
    moveWiresToBottom()

    // needs some wires to start this
    const bgAnimateWires = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* all(...wires.map(w=>w.animate()))
    })
    yield* all(
        registerNode().opacity(1,1)
    )
    yield* beginSlide('A and B registers')
    aRegister().reparent(aRect())
    bRegister().reparent(bRect())
    yield* all(
        aRectInternals().opacity(0,0.5),
        bRectInternals().opacity(0,0.5),
    )
    aRectInternals().remove()
    bRectInternals().remove()
    cancel(bgAnimateWires);
    const aTxt = aRect().children()[0] as Txt
    const bTxt = bRect().children()[0] as Txt
    yield* all(
        aRect().width(aTxt.width()+30, 1),
        bRect().width(bTxt.width()+30, 1),
        aRect().height(200, 1),
        bRect().height(200, 1),
        aTxt.position([0,-55],1),
        bTxt.position([0,-55],1),
        aRegister().position([0,35],1),
        bRegister().position([0,35],1),
        aTxt.offset([0,0],1),
        bTxt.offset([0,0],1),
    )
    yield* all(
        backgroundOpacity(1,1),
        aRect().position([0,-150],1),
        bRect().position([0,150],1),
        aRect().rotation(-90,1),
        bRect().rotation(-90,1),
        registerNode().scale(miniatureScale-registerMini, 1),
        registerNode().position([generalBusDistance, registerNodeYPos], 1)

    )

    const betweenParents = (point: PossibleVector2, parentFrom: Node, parentTo:Node) => {
        return new Vector2(point).transformAsPoint(parentFrom.localToWorld()).transformAsPoint(parentTo.worldToLocal())
    }

    const miniRegisterControlSignals = createRef<Node>()
    registerNode().add(<Node ref={miniRegisterControlSignals} opacity={0}>
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>busSignals[v]() == 1}
                isSolid
                jointStart
                points={[
                    [betweenParents([busWirePos(v), 0], busLayout(), registerNode()).x, aRect().position().y+50-15*v],
                    [aRect().top().x-115, aRect().position().y+50-15*v],
                ]}
            />)}
            
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>busSignals[v]() == 1}
                isSolid
                jointStart
                points={[
                    [betweenParents([busWirePos(v), 0], busLayout(), registerNode()).x, bRect().position().y+50-15*v],
                    [bRect().top().x-115, bRect().position().y+50-15*v],
                ]}
            />)}
            <Node scale={(1+miniatureScale)}>
                <VisualIO
                    rotation={-90}
                    position={[aRect().top().x-60,aRect().position.y()+40]}
                    powered={aRegisterIn}
                    name={`A Register In`}
                />
                <VisualIO
                    rotation={-90}
                    position={[aRect().top().x,aRect().position.y()+40]}
                    powered={aRegisterOut}
                    name={`A Register Out`}
                />
                <VisualIO
                    rotation={-90}
                    position={[bRect().top().x-60,bRect().position.y()-40]}
                    powered={bRegisterIn}
                    name={`B Register In`}
                />
                <VisualIO
                    rotation={-90}
                    position={[bRect().top().x,bRect().position.y()-40]}
                    powered={bRegisterOut}
                    name={`B Register Out`}
                />
            </Node>
        </Node>
    )
    yield* miniRegisterControlSignals().opacity(1,1)
    miniRegisterControlSignals().opacity(backgroundOpacity)
    registerNode().opacity(backgroundOpacity)
    yield* beginSlide('A and B mini')
    
    /**
     * End A and B Resgisters
     */
    /**
     * Ripple Adder
     */
    
    const rippleAdder = createRef<Rect>();
    const rippleTxt = createRef<Txt>();
    const zoomedRippleAdderIO = createRef<Layout>();
    const rippleSize = bits
    const rippleSpacing = 190
    const rippleAdders: FullAdder[] = []
    const rippleHeight = 700
    const rippleWidth = 1700
    
    view.add(
        <>
            <Rect
                ref={rippleAdder}
                width={rippleWidth}
                height={rippleHeight}
                lineWidth={5}
                opacity={0}
                stroke={colors.TEXT_COLOR}
                radius={10}

            >
                <Txt
                    ref={rippleTxt}
                    offset={[0,-1]}
                    position={[0,-rippleHeight/2+15]}
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={"Ripple Adder"}
                />
                <Layout
                    ref={zoomedRippleAdderIO}
                    layout
                    direction={'row'}
                    gap={20}
                    offset={[-1,-1]}
                    position={[-rippleWidth/2+15,-rippleHeight/2+15]}
                >
                    <VisualIO
                        powered={enableAdder}
                        name={"Enable Adder"}
                    />
                </Layout>
                {/* Do actual ripple adder here */}
                {range(rippleSize).map(i=>
                        <FullAdder
                            ref={makeRef(rippleAdders, rippleAdders.length)}
                            position={[i*rippleSpacing-4*rippleSpacing+95,0]}
                            // Note, the register output must be read first due to lazy loaded signals. enableAdder being first causes this to return early.
                            inputA={()=> aRegister().output()[i] == '1' && enableAdder()}
                            inputB={()=> bRegister().output()[i] == '1' && enableAdder()}
                            carryIn={()=>rippleAdders[i+1]?.carryOut() || false}
                            opacity={1}
                        />
                )}
                <Node ref={makeRef(wireLayouts, "rippleWires")}>
                    {rippleAdders.map((adder, i)=> <Node>
                            {/* Input A */}
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                isSolid
                                jointStart // Add visual IO
                                powered={adder.inputA}
                                points={[
                                    [adder.position.x(), adder.inputAPos.y+100],
                                    [adder.inputAPos.x, adder.inputAPos.y+100],
                                    adder.inputAPos,
                                ]}
                            />
                            {/* Input B */}
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                isSolid
                                jointStart // Add visual IO
                                powered={adder.inputB}
                                points={[
                                    [adder.position.x(), adder.inputBPos.y+200],
                                    [adder.inputBPos.x, adder.inputBPos.y+200],
                                    adder.inputBPos,
                                ]}
                            />
                            {/* Sum */}
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                isSolid
                                powered={adder.sum}
                                points={[
                                    adder.sumPos,
                                    [adder.sumPos.x,adder.sumPos.y-70]
                                ]}
                            />
                            {/* Carry */}
                            {(i!=0) && (
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                isSolid
                                powered={adder.carryOut}
                                points={[
                                    adder.carryOutPos,
                                    [adder.carryOutPos.x,adder.carryOutPos.y-20],
                                    [adder.position.x()-rippleSpacing/2,adder.carryOutPos.y-20],
                                    [adder.position.x()-rippleSpacing/2,rippleAdders[i-1].carryInPos.y],
                                    rippleAdders[i-1].carryInPos
                                ]}
                            />)}
                            <VisualIO
                                powered={adder.inputA}
                                position={[adder.position.x(), adder.inputAPos.y+100]}
                                name={"A"+superInts[rippleSize-i]}
                            />
                            <VisualIO
                                powered={adder.inputB}
                                position={[adder.position.x(), adder.inputBPos.y+200]}
                                name={"B"+superInts[rippleSize-i]}
                            />
                            <VisualIO
                                powered={adder.sum}
                                position={[adder.sumPos.x,adder.sumPos.y-70]}
                                name={"S"+superInts[rippleSize-i]}
                            />
                        </Node>
                    )}
                    <Wire
                        ref={makeRef(wires, wires.length)}
                        isSolid
                        powered={didOverflow}
                        points={[
                            rippleAdders[0].carryOutPos,
                            [rippleAdders[0].carryOutPos.x,rippleAdders[0].carryOutPos.y-150],
                        ]}
                    />
                    <VisualIO
                        position={[rippleAdders[0].carryOutPos.x,rippleAdders[0].carryOutPos.y-150]}
                        powered={didOverflow}
                        name={"Overflow"}
                    />
                </Node>
            </Rect>
        </>
    )
    didOverflow(rippleAdders[0].carryOut)
    moveWiresToBottom()
    yield* backgroundOpacity(0,1)
    yield* rippleAdder().opacity(1,1)
    yield* beginSlide('ripple adder')
    yield* all(
        rippleAdder().scale(miniatureScale-rippleMini, 1),
        zoomedRippleAdderIO().opacity(0,0.5),
        rippleAdder().height(rippleHeight-50,1),
        rippleTxt().position.y(rippleTxt().position.y()+30,1)
    )
    zoomedRippleAdderIO().remove()
    yield* all(
        rippleAdder().position([generalBusDistance+rippleExtraXDist, rippleNodeYPos], 1),
        backgroundOpacity(1,1),
    )
    rippleAdder().opacity(backgroundOpacity)
    const fromWorld = (point: PossibleVector2, parentTo:Node) => {
        return new Vector2(point).transformAsPoint(parentTo.worldToLocal())
    }
    wireLayouts.rippleWires.add(
        <>
            <Node ref={makeRef(wireLayouts, "rippleInputs")} opacity={0}>
                {/* A register connection */}
                {rippleAdders.map((adder, i)=><>
                        <Wire
                            ref={makeRef(wires, wires.length)}
                            powered={()=>enableAdder() && aRegister().output()[i]=="1"}
                            isSolid
                            jointStart
                            jointEnd
                            points={[
                                
                                fromWorld([aRegister().getInputPos(i).x+15, aRegister().getInputPos(i).y], rippleAdder()),
                                fromWorld([aRegister().getInputPos(i).x+rippleWireXOffset+(8*i), aRegister().getInputPos(i).y], rippleAdder()),
                                [fromWorld([aRegister().getInputPos(i).x+rippleWireXOffset+(8*i),aRegister().getInputPos(i).y], rippleAdder()).x, rippleAdder().position().y+rippleHeight/2-rippleNodeYPos+(15*i)],
                                [rippleAdders[i].inputAPos.x,rippleAdder().position().y+rippleHeight/2-rippleNodeYPos+(15*i)],
                                [rippleAdders[i].inputAPos.x, rippleAdders[i].inputAPos.y+100]
                            ]}
                        />
                    </>
                )}
                {/* B register connection */}
                {rippleAdders.map((adder, i)=><>
                        <Wire
                            ref={makeRef(wires, wires.length)}
                            powered={()=>enableAdder() && bRegister().output()[i]=="1"}
                            isSolid
                            jointStart
                            jointEnd
                            points={[
                                
                                fromWorld([bRegister().getInputPos(i).x+15, bRegister().getInputPos(i).y], rippleAdder()),
                                fromWorld([bRegister().getInputPos(i).x+rippleWireXOffset+70+(8*i), bRegister().getInputPos(i).y], rippleAdder()),
                                [fromWorld([bRegister().getInputPos(i).x+rippleWireXOffset+70+(8*i),bRegister().getInputPos(i).y], rippleAdder()).x, rippleAdder().position().y+rippleHeight/2-rippleNodeYPos+(15*i)+150],
                                [rippleAdders[i].inputBPos.x,rippleAdder().position().y+rippleHeight/2-rippleNodeYPos+(15*i)+150],
                                [rippleAdders[i].inputBPos.x, rippleAdders[i].inputBPos.y+200]
                            ]}
                        />
                    </>
                )}
                <Node scale={1+rippleMini}>
                    <VisualIO
                        rotation={90}
                        minWidth={450}
                        powered={enableAdder}
                        position={betweenParents([registerNode().position.x()-120, registerNode().position.y()-aRect().height()-20], registerNode(), rippleAdder())}
                        name="Enable Adder"
                    />
                </Node>
            </Node>
        </>
    )
    yield* wireLayouts.rippleInputs.opacity(1,1)
    yield* beginSlide('ripple adder mini')
    /**
     * End Ripple Adder
     */
    /**
     * Sum register
     */
    const sumRegisterNode = createRef<Node>();
    const sumRect = createRef<Rect>();
    const sumRegister = createRef<NBitRegister>();
    view.add(
        <Node
            opacity={0}
            ref={sumRegisterNode}
            scale={miniatureScale-registerMini}
            position={[generalBusDistance, sumRegisterNodeYPos]}
        >
            <Rect
                ref={sumRect}
                rotation={-90}
                width={200}
                height={200}
                lineWidth={5}
                stroke={colors.TEXT_COLOR}
                radius={10}
            >
                <Txt
                    position={[0,-55]}
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={'Sum Register'}
                />
                <NBitRegister
                    position={[0,35]}
                    ref={sumRegister}
                    numBits={bits}
                    input={()=>enableAdder() &&rippleAdders.map((v)=>v.sum() ? "1": "0").join('')}
                    load={enableAdder}
                />
            </Rect>
        </Node>
    )
    sumRect().width((sumRect().children()[0] as Txt).width()+30)
    const sumWireSpace = 13
    sumRegisterNode().add(
        <Node ref={makeRef(wireLayouts, "sumRegisterWires")}>
            {/* To bus */}
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>busSignals[v]() == 1}
                isSolid
                jointStart
                points={[
                    [betweenParents([busWirePos(v), 0], busLayout(), sumRegisterNode()).x, sumRect().position().y+50-15*v],
                    [sumRect().top().x-90, sumRect().position().y+50-15*v],
                ]}
            />)}
            {/* From adder */}
            {range(bits).map(i=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={rippleAdders[i].sum}
                isSolid
                points={[
                    betweenParents([rippleAdders[i].sumPos.x, rippleAdders[i].sumPos.y-70], rippleAdder(), sumRegisterNode()),
                    betweenParents([rippleAdders[i].sumPos.x, rippleAdders[i].sumPos.y-185+sumWireSpace*i], rippleAdder(), sumRegisterNode()),
                    betweenParents([
                        rippleAdders[bits-1].sumPos.x-((bits-1)*sumWireSpace)+sumWireSpace*i,
                        rippleAdders[i].sumPos.y-185+sumWireSpace*i], rippleAdder(), sumRegisterNode()),
                    [
                        betweenParents([rippleAdders[bits-1].sumPos.x-((bits-1)*sumWireSpace)+sumWireSpace*i,0], rippleAdder(), sumRegisterNode()).x,
                        fromWorld(sumRegister().getInputPos(bits-1-i), sumRegisterNode()).y
                    ],
                    [sumRect().bottom().x, fromWorld(sumRegister().getInputPos(bits-1-i), sumRegisterNode()).y]
                ]}
            />)}
            <VisualIO
                scale={1+miniatureScale}
                name={"Sum Out"}
                rotation={-90}
                position={[sumRect().top().x-50,sumRect().position.y()]}
                powered={enableSumOut}
            />
    </Node>)

    
    sumRegisterNode().moveBelow(rippleAdder())
    moveWiresToBottom()
    yield* sumRegisterNode().opacity(1,1)
    sumRegisterNode().opacity(backgroundOpacity)

    yield* beginSlide('sum register')
    /**
     * End Sum register
     */
    /**
     * Program counter
     */
    
    const programCounterNode = createRef<Node>();
    const programCounterRect = createRef<Rect>();
    const programCounter = createRef<NBitRegister>(); // We'll need to figure out how to update this when we implement the clock.
    view.add(
        <Node
            opacity={0}
            ref={programCounterNode}
            scale={miniatureScale-registerMini}
            position={[-generalBusDistance, programCounterNodeYPos]}
        >
            <Rect
                ref={programCounterRect}
                rotation={90}
                width={200}
                height={200}
                lineWidth={5}
                stroke={colors.TEXT_COLOR}
                radius={10}
            >
                <Txt
                    position={[0,-55]}
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={'Program Counter'}
                />
                <NBitRegister
                    position={[0,35]}
                    ref={programCounter}
                    numBits={bits}
                    input={()=>busBuffer}
                    load={false} // We'll handle this in the clock section in a second
                />
            </Rect>
            
        </Node>
    )
    programCounterRect().width((programCounterRect().children()[0] as Txt).width()+30)
    programCounterNode().add(
        <Node ref={makeRef(wireLayouts, "programCounterWires")}>
            <Txt
                position={[0,programCounterRect().left().y-15]}
                offset={[0,1]}
                fontSize={50}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={()=>'Value: ' + parseInt(programCounter().output(),2)}
            />
            {/* To bus */}
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>busSignals[v]() == 1}
                isSolid
                jointStart
                points={[
                    [betweenParents([busWirePos(v), 0], busLayout(), programCounterNode()).x, programCounterRect().position().y+50-15*v],
                    [programCounterRect().top().x+115, programCounterRect().position().y+50-15*v],
                ]}
            />)}
            <VisualIO
                scale={1+miniatureScale}
                name={"Program Counter Out"}
                rotation={90}
                position={[programCounterRect().top().x+50,programCounterRect().position.y()]}
                powered={programCounterOut}
            />
            <VisualIO
                scale={1+miniatureScale}
                name={"Set Program Counter"}
                rotation={90}
                position={[programCounterRect().top().x+50+90,programCounterRect().position.y()]}
                powered={programCounterIn}
            />
        </Node>)
    yield* programCounterNode().opacity(1,1)
    programCounterNode().opacity(backgroundOpacity)
    yield* beginSlide('program counter')
    /**
     * End Program Counter
     */
    /**
     * Clock (You can move this later! Also maybe add wires to everything)
     */
    const clock = createSignal(false);
    const clockIO = createRef<VisualIO>();
    view.add(<VisualIO
        opacity={0}
        ref={clockIO}
        scale={miniatureScale}
        name={"Clock"}
        powered={clock}
        position={[-generalBusDistance-clockExtraXDist, clockYPos]}
    />)

    // Handle clock stuff
    const initialClockHandler = ()=> {
        if (!clockEnable() || haltEnable()){
            return
        }
        clock(!clock())

        // handle program counter
        if (counterEnable() && !programCounterIn() && clock()){
            let out = programCounter().output()
            let num = parseInt(out,2)
            num += 1;
            let strNum = num.toString(2).padStart(bits, "0")
            programCounter().input(strNum.slice(strNum.length-bits))
            programCounter().load(true)
        } else if (programCounterIn() && clock()) {
            programCounter().input(()=>programCounterIn() && busBuffer)
            programCounter().load(true)
        } else {
            programCounter().load(false)
        }
        programCounter().output()
        
        // RAM Writing
        if (ramIn() && ramInAvailable()) {
            ramInAvailable(false)
            let addr = parseInt(memRegister().output(), 2)
            updateRam(addr, "00000000 "+busBuffer)
        }
        if (!ramIn()) {
            ramInAvailable(true)
        }
    }
    let bgRunClock: any = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* waitFor(clockSeconds)
        initialClockHandler()
    })
    yield* clockIO().opacity(1,0.5)
    clockIO().opacity(backgroundOpacity)

    // demonstration program counter
    clockEnable(true)
    counterEnable(true)
    yield* waitFor(1.5)
    clockEnable(false)
    counterEnable(false)
    yield* waitFor(0.5)
    clock(false)
    programCounter().reset(true)
    programCounter().load(true)
    programCounter().output()
    programCounter().reset(false)
    programCounter().load(false)
    cancel(bgRunClock)
    // end demonstration program counter
    yield* beginSlide('clock')
    /**
     * End Clock
     */
    /**
     * RAM
     */
    yield* backgroundOpacity(0,1)
    const ramCont = createRef<Rect>()
    const ramClip = createRef<Rect>()
    const ramTable = createRef<TruthTable>()
    const totalRamRows = 50
    view.add(<Rect
            ref={ramCont}
            opacity={0}
            lineWidth={5}
            width={900}
            stroke={colors.TEXT_COLOR}
            radius={10}
        >
        <Txt
            offset={[0,1]}
            fontSize={50}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={"RAM"}
        />
        <Rect
            ref={ramClip}
            height={500}
            stroke={'#ff0000'}
            lineWidth={0}
            offset={[0,1]}
            clip
        >
            <TruthTable
                ref={ramTable}
                columnNames={["dec", "address", "value"]}
                columnData={range(totalRamRows).map(v=>[v, v.toString(2).padStart(bits, "0"), "0".repeat(bits)+" "+"0".repeat(bits)])}
            />
        </Rect>
    </Rect>)
    ramCont().width(ramTable().table().width() + 30)
    ramClip().width(ramTable().table().width() + 30)
    const ramRowsDisplayed = 15
    const cellHeight = ramTable().cellHeight

    ramCont().height(cellHeight * ramRowsDisplayed+100);
    (ramCont().children()[0] as Txt).position.y(-(cellHeight * ramRowsDisplayed/2)+25)
    ramClip().height(cellHeight * ramRowsDisplayed+10)
    ramTable().currentOutputLine(0)
    ramClip().position([ramCont().bottom().x, ramCont().bottom().y-5])

    ramTable().position.y(-(cellHeight*(ramRowsDisplayed/2))+ramTable().table().height()/2)
    function* scrollRamToAddress(addr: number, duration: number) {
        if (addr < ramRowsDisplayed/2-2) {
            addr = ramRowsDisplayed/2-2
        }
        if (addr > ramTable().columnData().length-1-ramRowsDisplayed/2) {
            addr = ramTable().columnData().length-1-ramRowsDisplayed/2
        }
        yield* ramTable().position.y(-(cellHeight*(addr+2))+ramTable().table().height()/2, duration, easeInCubic)
    }
    yield* ramCont().opacity(1,1)
    yield* waitFor(0.5)
    yield* all(
        scrollRamToAddress(49, 1),
        ramTable().select(49, 1)
    )
    yield* waitFor(1)
    yield* all(
        scrollRamToAddress(0, 1),
        ramTable().select(0, 1)
    )
    yield* beginSlide('RAM')
    
    yield* all(
        ramCont().scale(miniatureScale, 1),
        ramCont().position([-generalBusDistance-ramExtraXDist, ramNodeYPos], 1),
        backgroundOpacity(1,1),
    )
    ramCont().opacity(backgroundOpacity)
    yield* beginSlide('RAM mini')

    const vramCont = createRef<Rect>()
    const vramClip = createRef<Rect>()
    const vramTable = createRef<TruthTable>()
    const vramEnd = totalRamRows
    const vramStart = vramEnd-(ramRowsDisplayed-1)
    const vramRowsDisplayed = vramEnd-vramStart
    view.add(<Rect
            ref={vramCont}
            scale={miniatureScale}
            position={ramCont().topLeft()}
            opacity={0}
            offset={[1,-1]}
            lineWidth={5}
            width={900}
            stroke={colors.TEXT_COLOR}
            radius={10}
        >
        <Txt
            offset={[0,1]}
            fontSize={50}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={"VRAM"}
        />
        <TruthTable
            ref={vramTable}
            position={[0,40]}
            hasSelector={false}
            columnNames={["dec addr", "dec value"]}
            columnData={()=>ramTable().columnData().slice(vramStart,vramEnd+1).map(v=>[v[0],parseInt(v[2].replace(" ", ""), 2).toString()])}
        />
    </Rect>)
    vramCont().width(vramTable().table().width() + 30)

    vramCont().height(cellHeight * (vramRowsDisplayed+1)+100);
    (vramCont().children()[0] as Txt).position.y(-(cellHeight * vramRowsDisplayed/2))
    const updateRam = (addr:number, value: string) => {
        let data = Array.from(ramTable().columnData())
        data[addr][2] = value
        ramTable().columnData(data)
    }
    yield* vramCont().opacity(1,1)
    vramCont().opacity(backgroundOpacity)
    yield* beginSlide('VRAM')
    
    // Add memory register
    const memRegisterNode = createRef<Node>();
    const memRegisterRect = createRef<Rect>();
    const memRegister = createRef<NBitRegister>(); // We'll need to figure out how to update this when we implement the clock.
    view.add(
        <Node
            opacity={0}
            ref={memRegisterNode}
            scale={miniatureScale-registerMini}
            position={[-generalBusDistance, memRegisterNodeYPos]}
        >
            <Rect
                ref={memRegisterRect}
                rotation={90}
                width={200}
                height={200}
                lineWidth={5}
                stroke={colors.TEXT_COLOR}
                radius={10}
            >
                <Txt
                    position={[0,-55]}
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={'Memory Register'}
                />
                <NBitRegister
                    position={[0,35]}
                    ref={memRegister}
                    numBits={bits}
                    // You need to include the load signal here too, I think so it's not just cached.
                    input={()=>memoryRegisterIn() && busBuffer}
                    load={memoryRegisterIn}
                />
            </Rect>
            
        </Node>
    )
    const ramOutYOffset =630
    const ramOutVisIOOffset = ramOutYOffset-40
    const ramInYOffset = ramOutYOffset-215
    const ramInVisIOOffset = ramOutVisIOOffset-280
    memRegisterRect().width((memRegisterRect().children()[0] as Txt).width()+30)
    memRegisterNode().add(
        <Node ref={makeRef(wireLayouts, "memRegisterWires")}>
            {/* To bus */}
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>busSignals[v]() == 1}
                isSolid
                jointStart
                points={[
                    [betweenParents([busWirePos(v), 0], busLayout(), memRegisterNode()).x, memRegisterRect().position().y+50-15*v],
                    [memRegisterRect().top().x+80, memRegisterRect().position().y+50-15*v],
                ]}
            />)}
            {/* To RAM */}
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>(ramOut() || ramIn()) && memRegister().output()[v]=="1"}
                isSolid
                jointEnd
                points={[
                    [memRegisterRect().bottom().x, memRegisterRect().bottom().y+50-15*v],
                    [betweenParents(ramClip().right(), ramCont(), memRegisterNode()).x, memRegisterRect().bottom().y+50-15*v],
                ]}
            />)}
            {/* RAM in from bus */}
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>busSignals[v]() == 1}
                isSolid
                jointEnd
                points={[
                    [betweenParents(ramClip().right(), ramCont(), memRegisterNode()).x+30, ramInYOffset-50-15*v],
                    [betweenParents([busWirePos(v), 0], busLayout(), memRegisterNode()).x, ramInYOffset-50-15*v],
                ]}
            />)}
            {/* RAM out to bus */}
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>busSignals[v]() == 1}
                isSolid
                jointEnd
                points={[
                    [betweenParents(ramClip().right(), ramCont(), memRegisterNode()).x+30, ramOutYOffset-50-15*v],
                    [betweenParents([busWirePos(v), 0], busLayout(), memRegisterNode()).x, ramOutYOffset-50-15*v],
                ]}
            />)}
            <VisualIO
                scale={1+miniatureScale}
                name={"RAM In"}
                rotation={90}
                position={[betweenParents(ramClip().right(), ramCont(), memRegisterNode()).x+50, ramInVisIOOffset]}
                powered={ramIn}
            />
            <VisualIO
                scale={1+miniatureScale}
                name={"RAM Value Out"}
                rotation={90}
                position={[betweenParents(ramClip().right(), ramCont(), memRegisterNode()).x+50, ramOutVisIOOffset]}
                powered={ramOut}
            />
            <VisualIO
                scale={1+miniatureScale}
                name={"Set Memory Register"}
                rotation={90}
                position={[memRegisterRect().top().x+50,memRegisterRect().position.y()]}
                powered={memoryRegisterIn}
            />

        </Node>)
    moveWiresToBottom()
    yield* memRegisterNode().opacity(1,1)
    memRegisterNode().opacity(backgroundOpacity)
    yield* beginSlide('memory register')
    /**
     * End RAM
     */

    /**
     * Instruction register
     */

    const instructionRegisterNode = createRef<Node>();
    const instructionRegisterRect = createRef<Rect>();
    const instructionRegister = createRef<NBitRegister>(); // We'll need to figure out how to update this when we implement the clock.
    view.add(
        <Node
            opacity={0}
            ref={instructionRegisterNode}
            scale={miniatureScale-registerMini}
            position={[-generalBusDistance, instructionRegisterNodeYPos]}
        >
            <Rect
                ref={instructionRegisterRect}
                rotation={90}
                width={200}
                height={200}
                lineWidth={5}
                stroke={colors.TEXT_COLOR}
                radius={10}
            >
                <Txt
                    position={[0,-55]}
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={'Instruction Register'}
                />
                <NBitRegister
                    position={[0,35]}
                    ref={instructionRegister}
                    numBits={bits*2}
                    input={()=>(ramOut() ? assembler(ramTable().outputRow()[2]).slice(0,bits): "0".repeat(bits))+busBuffer}
                    load={instructionRegisterIn}
                />
            </Rect>
        </Node>
    )
    instructionRegisterRect().width((instructionRegisterRect().children()[0] as Txt).width()+30)
    instructionRegisterNode().add(
        <Node ref={makeRef(wireLayouts, "instructionRegisterWires")}>
            {/* To bus */}
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>busSignals[v]() == 1}
                isSolid
                jointStart
                points={[
                    [betweenParents([busWirePos(v), 0], busLayout(), instructionRegisterNode()).x, instructionRegisterRect().position().y+100-15*v],
                    [instructionRegisterRect().top().x+115, instructionRegisterRect().position().y+100-15*v],
                ]}
            />)}
            {/* To RAM */}
            {range(bits).map(v=> <Wire
                ref={makeRef(wires, wires.length)}
                powered={()=>ramOut() && instructionRegister().output()[v] == "1"}
                isSolid
                points={[
                    betweenParents([ramClip().right().x+30, ramOutVisIOOffset-280-8*v], ramCont(), instructionRegisterNode()),
                    [instructionRegisterRect().top().x+250+15*v, betweenParents([0, ramOutVisIOOffset-280-8*v], ramCont(), instructionRegisterNode()).y],
                    [instructionRegisterRect().top().x+250+15*v, instructionRegisterRect().top().y-150+15*v],
                    [instructionRegisterRect().top().x+115, instructionRegisterRect().top().y-150+15*v],
                ]}
            />)}
            <VisualIO
                scale={1+miniatureScale}
                name={"Set Instruction Register"}
                rotation={90}
                position={[instructionRegisterRect().top().x+50+90,instructionRegisterRect().position.y()]}
                powered={instructionRegisterIn}
            />
            <VisualIO
                scale={1+miniatureScale}
                name={"Instruction Register Out"}
                rotation={90}
                position={[instructionRegisterRect().top().x+50,instructionRegisterRect().position.y()]}
                powered={instructionRegisterOut}
            />

        </Node>)
    instructionRegisterNode().moveBelow(ramCont())
    moveWiresToBottom()
    yield* instructionRegisterNode().opacity(1,1)
    instructionRegisterNode().opacity(backgroundOpacity)

    yield* beginSlide('instruction register')
    /**
     * End Instruction register
     */

    /**
     * Control logic
     */
    const ctrlIntroTables = createRef<TruthTable>()
    const introInstrTable = createRef<TruthTable>()
    const introCtrlSigTable = createRef<TruthTable>()
    view.add(
    <Node
        ref={ctrlIntroTables}
        opacity={0}
        scale={miniatureScale}
        position={[generalBusDistance+350, 220]}
    >
        <Txt
            position={[0,-55]}
            fontSize={40}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={'Instructions'}
        />
        <TruthTable
            ref={introInstrTable}
            hasSelector={false}
            x={-10}
            columnNames={
                ["LOADA $N",    "ADD",         "STOREA $N",   "JMP $N"]}
            columnData={[
                ["PCO MRI",     "PCO MRI",     "PCO MRI",     "PCO MRI"],
                ["RVO IRI PCE", "RVO IRI PCE", "RVO IRI PCE", "RVO IRI PCE"],
                ["IRO MRI",     "EA",          "IRO MRI",     "IRO PCI"],
                ["RVO ARI",     "SRO ARI",     "ARO RVI",     ""],
            ]}
        />
        <TruthTable
            ref={introCtrlSigTable}
            x={10}
            hasSelector={false}
            columnNames={["Ctrl Signals", "Description"]}
            columnData={[
                ["PCI","Program Counter In"],
                ["PCO","Program Counter Out"],
                ["PCE","Program Counter Enable"],
                ["MRI","Memory Register In"],
                ["RVI","RAM Value In"],
                ["RVO","RAM Value Out"],
                ["IRI","Instruction Register In"],
                ["IRO","Instruction Register Out"],
                ["ARI","A Register In"],
                ["ARO","A Register Out"],
                ["BRI","B Register In"],
                ["BRO","B Register Out"],
                ["EA", "Enable Adder"],
                ["SRO","Sum Register Out"],
                ["HE","Halt enable"],
            ]}
        />
    </Node>);
    introInstrTable().table().offset([1,-1]);
    introCtrlSigTable().table().offset([-1,-1]);
    (ctrlIntroTables().children()[0] as Txt).position.x(-1*(introInstrTable().table().width()/2-10));
    yield* ctrlIntroTables().opacity(1,1)

    const ctrlIntroTablesOffset = 190
    yield* beginSlide('control logic intro')
    yield* all(
        backgroundOpacity(0,1),
        ctrlIntroTables().position(ctrlIntroTables().position().add([0, ctrlIntroTablesOffset]),1)
    )

    const controlLogicRect = createRef<Rect>();
    const controlLogic = createRef<Node>();
    const controlLogicTxt = createRef<Txt>();
    const controlLogicWidth = 1700
    const controlLogicHeight = 800
    const controlMiniScale = 0.6
    view.add(
        <>
            <Rect
                ref={controlLogicRect}
                width={controlLogicWidth}
                height={controlLogicHeight}
                position={[0,-50]}
                lineWidth={5}
                opacity={0}
                stroke={colors.TEXT_COLOR}
                radius={10}
            >
                <Txt
                    ref={controlLogicTxt}
                    offset={[0,-1]}
                    position={[0,-controlLogicHeight/2+15]}
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={"Control Logic"}
                />
                <Node
                    ref={controlLogic}
                    scale={controlMiniScale}
                />
            </Rect>
        </>
    )
    const controlMicroCounter = createRef<NBitRegister>();
    const miniCounterBitsIn = bits/2
    controlLogic().add(
        <>
            <NBitRegister
                ref={controlMicroCounter}
                position={[-1300,-570]}
                numBits={miniCounterBitsIn}
            />
            <Txt
                position={controlMicroCounter().position().addY(-70)}
                fontSize={30}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"micro counter"}
            />
        </>
    )
    yield* controlLogicRect().opacity(1,1)
    yield* beginSlide('microcode counter')
    const rawDecoder = createRef<Node>();
    const rawDecoderOutput = createRef<Node>();
    const decoderNotScale=0.35
    const decoderHeight=450
    const decoderSpacing=25
    const decoderStart = (miniCounterBitsIn*15+30)
    const decoderNotSpacing=25
    const decoderAndScale =0.75
    const decoderAndXpos=200
    const decoderAndYOffset=30
    const decoderOutputs = 5
    const decoderOutSpacing = (decoderHeight-decoderStart)/decoderOutputs
    const decoderOutWireOffset = 7
    const decoderNotGates: NotGate[] = [];
    controlLogic().add(<Node ref={rawDecoder} opacity={0}>
        {/* initial wires */}
        {range(miniCounterBitsIn).map(v=><Wire
            ref={makeRef(wires, wires.length)}
            isSolid
            points={[
                // Only using input pos for aesthetic purposes, these are outputs
                fromWorld(controlMicroCounter().getInputPos(v), controlLogic()),
                fromWorld(controlMicroCounter().getInputPos(v).addY(v*10+10), controlLogic()),
                fromWorld(controlMicroCounter().getInputPos(v).add([(miniCounterBitsIn-v-1)*decoderSpacing+decoderNotSpacing,v*10+10]), controlLogic()),
                fromWorld(controlMicroCounter().getInputPos(v).add([(miniCounterBitsIn-v-1)*decoderSpacing+decoderNotSpacing,decoderStart]), controlLogic()),
            ]}
        />)}
        {/* Data */}
        {range(miniCounterBitsIn).map(v=><Wire
            ref={makeRef(wires, wires.length)}
            isSolid
            jointStart
            points={[
                fromWorld(controlMicroCounter().getInputPos(v).add([(miniCounterBitsIn-v-1)*decoderSpacing,v*10+10]), controlLogic()),
                fromWorld(controlMicroCounter().getInputPos(v).add([(miniCounterBitsIn-v-1)*decoderSpacing,decoderHeight]), controlLogic()),
            ]}
        />)}
        {/* Not Gates */}
        {range(miniCounterBitsIn).map(v=><NotGate
            ref={makeRef(decoderNotGates, decoderNotGates.length)}
            position={fromWorld(controlMicroCounter().getInputPos(v).add([(miniCounterBitsIn-v-1)*decoderSpacing+decoderNotSpacing,decoderStart]), controlLogic())}
            rotation={180}
            scale={decoderNotScale}
        />)}
        {/* Not Data */}
        {range(miniCounterBitsIn).map(v=><Wire
            ref={makeRef(wires, wires.length)}
            isSolid
            powered={decoderNotGates[v].output}
            points={[
                fromWorld(controlMicroCounter().getInputPos(v).add([(miniCounterBitsIn-v-1)*decoderSpacing+decoderNotSpacing,decoderStart]), controlLogic()),
                fromWorld(controlMicroCounter().getInputPos(v).add([(miniCounterBitsIn-v-1)*decoderSpacing+decoderNotSpacing,decoderHeight]), controlLogic())
            ]}
        />)}
        <Node ref={rawDecoderOutput} opacity={0}>
            {/* And wires */}
            {range(decoderOutputs).map(v=><Node>{(decoderOutputs-v).toString(2).padStart(miniCounterBitsIn,"0").split('').reverse().map((n,i)=><Wire
                ref={makeRef(wires, wires.length)}
                isSolid
                jointStart
                points={[
                    (n=="0"?
                    fromWorld(controlMicroCounter().getInputPos(i).add(
                        [(miniCounterBitsIn-i-1)*decoderSpacing+decoderNotSpacing,
                        decoderStart-decoderAndYOffset+(v+1)*decoderOutSpacing+(i-miniCounterBitsIn/2)*10+decoderOutWireOffset]), controlLogic()):
                    fromWorld(controlMicroCounter().getInputPos(i).add(
                        [(miniCounterBitsIn-i-1)*decoderSpacing,
                        decoderStart-decoderAndYOffset+(v+1)*decoderOutSpacing+(i-miniCounterBitsIn/2)*10+decoderOutWireOffset]), controlLogic())
                    ),
                    fromWorld(controlMicroCounter().getInputPos(0).add(
                        [decoderAndXpos-20,
                        decoderStart-decoderAndYOffset+(v+1)*decoderOutSpacing+(i-miniCounterBitsIn/2)*10+decoderOutWireOffset]), controlLogic()),
                ]}
                powered={n=="0"}
            />)}
            </Node>)}
            {/* And gates */}
            {range(decoderOutputs).map(v=>
                <Node>
                    <AndGate
                        rotation={90}
                        scale={decoderAndScale}
                        position={fromWorld(controlMicroCounter().getInputPos(0).add([decoderAndXpos,
                            decoderStart-decoderAndYOffset+(v+1)*decoderOutSpacing+3]), controlLogic())}
                    />
                    <Txt
                        position={fromWorld(controlMicroCounter().getInputPos(0).add([decoderAndXpos+30,
                            decoderStart-decoderAndYOffset+(v+1)*decoderOutSpacing+3]), controlLogic())}
                        fontSize={30}
                        fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                        fill={colors.TEXT_COLOR}
                        fontFamily="Helvetica"
                        text={decoderOutputs-v +""}
                    />
                </Node>
        )}
        </Node>
    </Node>)
    moveWiresToBottom()
    yield* rawDecoder().opacity(1,1)
    yield* beginSlide('microcode counter decoder start')
    yield* rawDecoderOutput().opacity(1,1)
    yield* beginSlide('microcode counter decoder output')
    
    const counterMiniDecoder = createRef<Decoder>();
    const counterMiniDecoderNode = createRef<Decoder>();
    const decoderOutBits = 5
    const controlWiresXOffset = 50
    controlLogic().add(
        <Node ref={counterMiniDecoderNode} opacity={0}>
            <Decoder
                position={controlMicroCounter().position().addY(270)}
                ref={counterMiniDecoder}
                input={controlMicroCounter().output}
                numBitsOut={decoderOutBits}
            />
            {/* inputs */}
            {range(miniCounterBitsIn).map(v=><Wire
                ref={makeRef(wires, wires.length)}
                isSolid
                points={[
                    fromWorld(controlMicroCounter().getInputPos(v), controlLogic()),
                    counterMiniDecoder().getTopIOPos(v, miniCounterBitsIn),
                ]}
                powered={()=>counterMiniDecoder().input()[miniCounterBitsIn-v-1]=="1"}
            />)}
            {/* Outputs */}
            {range(decoderOutBits-1).map(v=><Wire
                ref={makeRef(wires, wires.length)}
                isSolid
                points={[
                    counterMiniDecoder().getRightIOPos(v, decoderOutBits),
                    [controlLogicWidth/0.6/2-controlWiresXOffset, counterMiniDecoder().getRightIOPos(v, decoderOutBits).y]
                ]}
                powered={()=>counterMiniDecoder().output()[v]=="1"}
            />)}
            {/* Reset Signal */}
            <Wire
                ref={makeRef(wires, wires.length)}
                isSolid
                points={[
                    counterMiniDecoder().getRightIOPos(decoderOutBits-1, decoderOutBits),
                    counterMiniDecoder().getRightIOPos(decoderOutBits-1, decoderOutBits).addX(20),
                    [counterMiniDecoder().getRightIOPos(decoderOutBits-1, decoderOutBits).addX(20).x, controlMicroCounter().position.y()],
                    controlMicroCounter().position()
                ]}
                powered={()=>counterMiniDecoder().output()[decoderOutBits-1]=="1"}
            />
        </Node>
    )
    counterMiniDecoderNode().moveBelow(controlMicroCounter())
    moveWiresToBottom()
    yield* rawDecoder().opacity(0,1)
    yield* counterMiniDecoderNode().opacity(1,1)
    rawDecoder().remove()
    yield* beginSlide('mini decoder')

    const instructionDecoderNode = createRef<Node>();
    const instructionDecoder = createRef<Decoder>();
    const instructionDecoderTitle = createRef<Txt>();
    const instrDecodeInBits = 8;
    const instrDecodeOutBits = instructionMap.length -1;
    controlLogic().add(
        <Node ref={instructionDecoderNode} opacity={0}>
            <Decoder
                position={controlMicroCounter().position().add([200, 100])}
                ref={instructionDecoder}
                input={()=>instructionRegister().output().slice(0,bits)}
                numBitsOut={instrDecodeOutBits}
                opacity={1}
            />
            <Txt
                ref={instructionDecoderTitle}
                position={instructionDecoder().position().addY(-170)}
                fontSize={30}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={"instruction"}
            />
            <Node ref={makeRef(wireLayouts, "instructionDecoderInitialInputs")}>
                {range(instrDecodeInBits).map(v=><Wire
                    // ref={makeRef(wires, wires.length)}
                    isSolid
                    points={[
                        instructionDecoder().getTopIOPos(v, instrDecodeInBits).addY(-70),
                        instructionDecoder().getTopIOPos(v, instrDecodeInBits),
                    ]}
                    powered={()=>instructionDecoder().input()[instrDecodeInBits-v-1]=="1"}
                />)}
            </Node>
            <Node ref={makeRef(wireLayouts, "instructionDecoderOutputs")}>
                {range(instrDecodeOutBits).map(v=><Wire
                    // ref={makeRef(wires, wires.length)}
                    isSolid
                    points={[
                        instructionDecoder().getRightIOPos(v),
                        [controlLogicWidth/0.6/2-controlWiresXOffset, instructionDecoder().getRightIOPos(v).y]
                    ]}
                    powered={()=>instructionDecoder().output()[v]=="1"}
                />)}
            </Node>
        </Node>
    )
    moveWiresToBottom();
    yield* instructionDecoderNode().opacity(1,1)
    
    yield* beginSlide('instruction decoder')
    const constrolSignalVisualIONode = createRef<Node>();
    const microCodeSpacing = 138
    const microCodeYPos = 630
    const microWiresYOffset = 50
    // Scaling affects positioning. Tis a silly place.
    controlLogic().add(<Node
        ref={constrolSignalVisualIONode}
        position={[-controlLogicWidth/2/0.6,0]}
        opacity={0}
    >
       {controlSignalNameList.map((v, i)=>
            <VisualIO
                name={v}
                powered={controlSignalMap[v]}
                position={[controlWiresXOffset+microCodeSpacing*i,microCodeYPos]}
            />
        )}
        <Node ref={makeRef(wireLayouts, "controlSignalWires")}>
            {controlSignalNameList.map((v, i)=><Node>
                <Wire
                    ref={makeRef(wires,wires.length)}
                    isSolid
                    powered={controlSignalMap[v]}
                    points={[
                        [controlWiresXOffset,microCodeYPos-microWiresYOffset-15*i],
                        [controlLogicWidth/0.6-controlWiresXOffset,microCodeYPos-microWiresYOffset-15*i],
                    ]}
                />
            </Node>)}
            {/* Separated so the connection wires appear on top */}
            {controlSignalNameList.map((v, i)=><Node>
                <Wire
                    ref={makeRef(wires,wires.length)}
                    isSolid
                    jointEnd
                    powered={controlSignalMap[v]}
                    points={[
                        [controlWiresXOffset+microCodeSpacing*i,microCodeYPos],
                        [controlWiresXOffset+microCodeSpacing*i,microCodeYPos-microWiresYOffset-15*i]
                    ]}
                />
            </Node>)}
        </Node>
    </Node>)
    moveWiresToBottom();
    yield* constrolSignalVisualIONode().opacity(1,1)
    yield* beginSlide('control signals')

    const instrAndSpacing = 50;
    const isntrAndRefs: Record<string, AndGate> = {};
    const makeInstruction = (position: PossibleVector2, name:string, steps: string[], stepNumOffset: number = 2) => {
        const pos = new Vector2(position)
        let splitSteps = steps.map(s=>s.split(" "))
        return <>
            <Txt
                position={pos.addX(-20)}
                fontSize={25}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                text={name}
            />
            {splitSteps.map((row, rowIdx)=><Node>
                <AndGate
                    ref={makeRef(isntrAndRefs, name+rowIdx)}
                    rotation={-90}
                    position={pos.addY(40+instrAndSpacing*rowIdx)}
                    scale={0.5}
                    inputA={()=>instructionDecoder().output()[instructionMap.indexOf(name)-1]=="1"}
                    inputB={()=>counterMiniDecoder().output()[stepNumOffset+rowIdx]=="1"} // counter val
                />
                {/* Output wires */}
                {row.map(m=>{
                    return <>
                    <Wire ref={makeRef(wires, wires.length)}
                        isSolid
                        jointEnd
                        powered={isntrAndRefs[name+rowIdx].output}
                        points={[
                            isntrAndRefs[name+rowIdx].outputPos,
                            isntrAndRefs[name+rowIdx].outputPos.addX(-10-15*(splitSteps.length-rowIdx)),
                            [isntrAndRefs[name+rowIdx].outputPos.addX(-10-15*(splitSteps.length-rowIdx)).x, microCodeYPos-microWiresYOffset-15*controlSignalNameList.indexOf(m)]
                        ]}
                    />
                </>})}
                {/* Input Wires */}
                
                <Wire ref={makeRef(wires, wires.length)}
                    isSolid
                    jointStart
                    powered={isntrAndRefs[name+rowIdx].inputB}
                    points={[
                        [isntrAndRefs[name+rowIdx].inputBPos.addX(20+25*(rowIdx)).x, fromWorld(counterMiniDecoder().getRightIOPos(rowIdx+stepNumOffset), controlLogic()).y],
                        isntrAndRefs[name+rowIdx].inputBPos.addX(20+25*(rowIdx)),
                        isntrAndRefs[name+rowIdx].inputBPos,
                    ]}
                />
                <Wire ref={makeRef(wires, wires.length)}
                    isSolid
                    jointStart
                    powered={isntrAndRefs[name+rowIdx].inputA}
                    points={[
                        [isntrAndRefs[name+rowIdx].inputAPos.addX(30+25*(rowIdx)).x,
                        fromWorld(instructionDecoder().getRightIOPos(instructionMap.indexOf(name)-1), controlLogic()).y],
                        isntrAndRefs[name+rowIdx].inputAPos.addX(30+25*(rowIdx)),
                        isntrAndRefs[name+rowIdx].inputAPos,
                    ]}
                />
            </Node>)}
        </>
    }
    const basicInstrSpacing = 180
    const commonMicroCodeXPos =-1000-basicInstrSpacing
    const microInstructionsNode = createRef<Node>();
    controlLogic().add(<Node ref={microInstructionsNode} opacity={0}>
        {/* common microcode */}
        <Txt
            position={[commonMicroCodeXPos-70, -100]}
            fontSize={25}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={"common"}
        />
        <>
            {commonMicroCodeSplit.map((row,rowIdx)=>row.map(m=>
                <Wire ref={makeRef(wires, wires.length)}
                    isSolid
                    jointStart
                    jointEnd
                    powered={()=>counterMiniDecoder().output()[rowIdx]=="1"}
                    points={[
                        [commonMicroCodeXPos+15*rowIdx, fromWorld(counterMiniDecoder().getRightIOPos(rowIdx), controlLogic()).y],
                        [commonMicroCodeXPos+15*rowIdx, microCodeYPos-microWiresYOffset-15*controlSignalNameList.indexOf(m)]
                    ]}
                />
            ))}
        </>
        {/* Rest of the basic instructions */}
        <>{
            Object.keys(basicInstrToMicroCode).map((v, i)=>
                makeInstruction([-1000+basicInstrSpacing*i,-100], v, basicInstrToMicroCode[v])
            )
        }</>
    </Node>)
    moveWiresToBottom();
    yield* microInstructionsNode().opacity(1,1)
    yield* beginSlide('basic micro instructions')

    const movNode = createRef<Node>();
    const movPos = new Vector2([-1000+basicInstrSpacing*8,-100+40])
    const numOfAnds = 7
    const instrStep = 2
    const initialAndWireOffset = 75 
    const isMOVAndGate = createRef<AndGate>();
    controlLogic().add(<Node ref={movNode} opacity={0}>
        <Txt
            position={movPos.add([-20,-40])}
            fontSize={25}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={"MOV"}
        />
        <AndGate
            ref={isMOVAndGate}
            rotation={90}
            position={movPos.addX(-25)}
            scale={0.5}
            inputA={()=>instructionDecoder().output()[instructionMap.indexOf("MOV")-1]=="1"}
            inputB={()=>counterMiniDecoder().output()[2]=="1"} // Register map
        />
        {/* Initial isMOV AND input wires */}
        <Wire ref={makeRef(wires, wires.length)}
            isSolid
            jointStart
            powered={isMOVAndGate().inputB}
            points={[
                [isMOVAndGate().inputAPos.addX(-20).x, fromWorld(counterMiniDecoder().getRightIOPos(instrStep), controlLogic()).y],
                isMOVAndGate().inputAPos.addX(-20),
                isMOVAndGate().inputAPos,
            ]}
        />
        <Wire ref={makeRef(wires, wires.length)}
            isSolid
            jointStart
            powered={isMOVAndGate().inputA}
            points={[
                [isMOVAndGate().inputBPos.addX(-30).x, fromWorld(instructionDecoder().getRightIOPos(instructionMap.indexOf("MOV")-1), controlLogic()).y],
                isMOVAndGate().inputBPos.addX(-30),
                isMOVAndGate().inputBPos,
            ]}
        />

        {/* MOV And gates */}
        {movSignals.map((row, rowIdx)=>
            <AndGate
                ref={makeRef(isntrAndRefs, "MOV"+rowIdx)}
                rotation={-90}
                position={movPos.addY(40+instrAndSpacing*rowIdx)}
                scale={0.5}
                inputA={()=>instructionRegister().output()[bits+movRegBitMap[row]]=="1"} // Register map
                inputB={isMOVAndGate().output}
            />
        )}

        <Node ref={makeRef(wireLayouts, "movOutWires")}>
            {/* Initial isMOV AND output wire */}
            <Wire ref={makeRef(wires, wires.length)}
                isSolid
                powered={isMOVAndGate().output}
                points={[
                    isMOVAndGate().outputPos,
                    isMOVAndGate().outputPos.addX(initialAndWireOffset),
                    [isMOVAndGate().outputPos.addX(initialAndWireOffset).x, isntrAndRefs["MOV"+(movSignals.length-1)].inputBPos.y],
                ]}
            />
            
            {movSignals.map((row, rowIdx)=><Node>
                {/* Output wires */}
                
                <Wire ref={makeRef(wires, wires.length)}
                        isSolid
                        jointEnd
                        powered={isntrAndRefs["MOV"+rowIdx].output}
                        points={[
                            isntrAndRefs["MOV"+rowIdx].outputPos,
                            isntrAndRefs["MOV"+rowIdx].outputPos.addX(-5-15*(numOfAnds-rowIdx)),
                            [isntrAndRefs["MOV"+rowIdx].outputPos.addX(-5-15*(numOfAnds-rowIdx)).x, microCodeYPos-microWiresYOffset-15*controlSignalNameList.indexOf(row)]
                        ]}
                    />
                {/* Instr input wire */}
                <Wire ref={makeRef(wires, wires.length)}
                    isSolid
                    jointStart
                    powered={isntrAndRefs["MOV"+rowIdx].inputB}
                    points={[
                        [isMOVAndGate().outputPos.addX(initialAndWireOffset).x, isntrAndRefs["MOV"+rowIdx].inputBPos.y],
                        isntrAndRefs["MOV"+rowIdx].inputBPos,
                    ]}
                />
            </Node>)}
        </Node>
    </Node>)
    moveWiresToBottom();
    yield* movNode().opacity(1,1)
    yield* beginSlide('MOV instruction')
    
    yield* controlLogicRect().scale(miniatureScale-controlLogicMini, 1)
    yield* all(
        controlLogicRect().position([-generalBusDistance-controlLogicExtraXDist, controlLogicYPos], 1),
        instructionDecoderTitle().opacity(0,1),
        wireLayouts.instructionDecoderInitialInputs.opacity(0,1),
        backgroundOpacity(1,1),

        ctrlIntroTables().position(ctrlIntroTables().position().add([0, -ctrlIntroTablesOffset]),1),
        introInstrTable().opacity(0,1),
    )
    instructionDecoderTitle().remove()
    wireLayouts.instructionDecoderInitialInputs.remove()

    const instrToLogicWireGap=20
    const instrToMovWireOffsetX = 100
    controlLogic().add(<Node ref={makeRef(wireLayouts, "movToInstructionRegisterWires")} opacity={0}>
        {/* Instruction wires */}
        {range(bits).map(v=><Wire
            ref={makeRef(wires, wires.length)}
            isSolid
            jointStart
            powered={()=>instructionRegister().output()[v] == "1"}
            points={[
                fromWorld(instructionRegister().getInputPos(v+bits), controlLogic()).add([-25,-8*v-instrToLogicWireGap]),
                [fromWorld(instructionDecoder().getTopIOPos(v, bits), controlLogic()).x,
                    fromWorld(instructionRegister().getInputPos(v+bits), controlLogic()).addY(-8*v-instrToLogicWireGap).y],
                fromWorld(instructionDecoder().getTopIOPos(v, bits), controlLogic()),
            ]}
        />)}
        {/* Arguments wires */}
        {range(bits-1).map(v=><Wire
            ref={makeRef(wires, wires.length)}
            isSolid
            jointStart
            powered={()=>instructionRegister().output()[(bits*2)-v-1] == "1"}
            points={[
                fromWorld(instructionRegister().getInputPos(v+1), controlLogic()).add([-25,8*(bits-v)+instrToLogicWireGap]),
                [movPos.x+instrToMovWireOffsetX+15*(bits-v),
                    fromWorld(instructionRegister().getInputPos(v+1), controlLogic()).addY(8*(bits-v)+instrToLogicWireGap).y],
                [movPos.x+instrToMovWireOffsetX+15*(bits-v), isntrAndRefs["MOV"+(movSignals.length-v-1)].inputAPos.y],
                isntrAndRefs["MOV"+(movSignals.length-v-1)].inputAPos,
            ]}
        />)}
        {/* That extra argument bit */}
        <Wire
            ref={makeRef(wires, wires.length)}
            isSolid
            jointStart
            jointEnd
            powered={()=>instructionRegister().output()[bits] == "1"}
            points={[
                fromWorld(instructionRegister().getInputPos(bits), controlLogic()).add([-25,8+instrToLogicWireGap]),
                [movPos.x+instrToMovWireOffsetX+15,
                    fromWorld(instructionRegister().getInputPos(bits), controlLogic()).add([-125,8+instrToLogicWireGap]).y],
            ]}
        />
    </Node>)

    const notClockOffsetY= -200
    controlLogic().add(<Node ref={makeRef(wireLayouts, "microCounterNotAndWire")}  opacity={0}>
        {/* Clock to NOT */}
        <Wire
            ref={makeRef(wires, wires.length)}
            isSolid
            powered={()=>clock()}
            points={[
                betweenParents(clockIO().position(), view, controlLogic()),
                betweenParents(clockIO().position().addX(microCounterNotClockOffsetX), view, controlLogic()),
                [
                    betweenParents(clockIO().position().addX(microCounterNotClockOffsetX), view, controlLogic()).x,
                    controlMicroCounter().position.y()+notClockOffsetY
                ],
            ]}
        />
        {/* NOT to counter */}
        <Wire
            ref={makeRef(wires, wires.length)}
            isSolid
            powered={()=>!clock()}
            points={[
                [
                    betweenParents(clockIO().position().addX(microCounterNotClockOffsetX), view, controlLogic()).x,
                    controlMicroCounter().position.y()+notClockOffsetY
                ],
                [
                    betweenParents(clockIO().position().addX(microCounterNotClockOffsetX), view, controlLogic()).x,
                    controlMicroCounter().position.y()
                ],
                controlMicroCounter().position()
            ]}
        />
        <NotGate
            inputA={clock}
            position={[
                betweenParents(clockIO().position().addX(microCounterNotClockOffsetX), view, controlLogic()).x,
                controlMicroCounter().position.y()+notClockOffsetY
            ]}
            rotation={180}
        />
    </Node>
    )
    clockIO().moveAbove(controlLogicRect())
    moveWiresToBottom();
    
    introInstrTable().columnNames(["Instruction", "Description"])
    introInstrTable().columnData(
        [
            ["NOOP",      "Do nothing"],
            ["LOADA $N",  "Set A reg to value from mem addr $N"],
            ["LOADB $N",  "Set B reg to value from mem addr $N"],
            ["SETA",      "Set A reg directly to value"],
            ["STOREA $N", "Store A reg value to mem addr $N"],
            ["STORETB",   "Store A to the address the B reg is set to"],
            ["MOV $R1 $R2", "Copy data from $R1 to $R2"],
            ["ADD",       "Adds the A and B registers, storing in A reg"],
            ["JMP $N",    "Sets program counter to $N"],
            ["JMPC $N",   "Sets program counter to $N if the carry flag is true"],
            ["HALT",      "Pauses clock"],
        ]
    )
        
    // DEBUG LAYOUT (That I decided to leave visible)
    const debugWidth = 150
    const debugLayout = createRef<Layout>();
    view.add(<Layout
            ref={debugLayout}
            position={[-400, -370]}
            direction={'column'}
            layout
            opacity={0}
        >
        <Txt
            fontSize={20}
            width={debugWidth}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={"Reg values"}
        />
        <Txt
            fontSize={20}
            width={debugWidth}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={()=>"M: "+parseInt(memRegister().output(),2).toString()}
        />
        <Txt
            fontSize={20}
            width={debugWidth}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={()=>"I: "+instructionMap[parseInt(instructionRegister().output().slice(0,bits),2)]+" "+parseInt(instructionRegister().output().slice(bits),2).toString()}
        />
        <Txt
            fontSize={20}
            width={debugWidth}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={()=>"A: "+parseInt(aRegister().output(),2).toString()}
        />
        <Txt
            fontSize={20}
            width={debugWidth}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={()=>"B: "+parseInt(bRegister().output(),2).toString()}
        />
    </Layout>)

    
    yield* all(
        wireLayouts.movToInstructionRegisterWires.opacity(1,1),
        wireLayouts.microCounterNotAndWire.opacity(1,1),
    )
    yield* all(
        introInstrTable().opacity(1,1),
        debugLayout().opacity(1,1),
    )
    yield* beginSlide('scaled control logic')

    /**
     * End Control logic
     */
    /**
     * JMPC instruction
     */
    
    
    const jmpcPos = new Vector2([-1000+basicInstrSpacing*10,-100+40])
    const jmpcNode = createRef<Node>();
    const isJMPCAndGate = createRef<AndGate>();
    const overflowFlagBitIndex = 1
    controlLogic().add(<Node ref={jmpcNode} opacity={0}>
        <Txt
            position={jmpcPos.add([-20,-40])}
            fontSize={25}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={"JMPC"}
        />
        <AndGate
            ref={isJMPCAndGate}
            rotation={90}
            position={jmpcPos.addX(-25)}
            scale={0.5}
            inputA={()=>instructionDecoder().output()[instructionMap.indexOf("JMPC")-1]=="1"}
            inputB={()=>counterMiniDecoder().output()[overflowFlagBitIndex]=="1"}
        />
        {/* Initial isJMPC AND input wires */}
        <Wire ref={makeRef(wires, wires.length)}
            isSolid
            jointStart
            powered={isJMPCAndGate().inputB}
            points={[
                [isJMPCAndGate().inputAPos.addX(-20).x, fromWorld(counterMiniDecoder().getRightIOPos(instrStep), controlLogic()).y],
                isJMPCAndGate().inputAPos.addX(-20),
                isJMPCAndGate().inputAPos,
            ]}
        />
        <Wire ref={makeRef(wires, wires.length)}
            isSolid
            jointStart
            powered={isJMPCAndGate().inputA}
            points={[
                [isJMPCAndGate().inputBPos.addX(-30).x, fromWorld(instructionDecoder().getRightIOPos(instructionMap.indexOf("JMPC")-1), controlLogic()).y],
                isJMPCAndGate().inputBPos.addX(-30),
                isJMPCAndGate().inputBPos,
            ]}
        />
        <AndGate
            ref={makeRef(isntrAndRefs, "JMPC0")}
            rotation={-90}
            position={jmpcPos.addY(40)}
            scale={0.5}
            inputB={isJMPCAndGate().output}
            inputA={()=>flagsRegister().output()[overflowFlagBitIndex]=="1"}
        />

        <Node ref={makeRef(wireLayouts, "movOutWires")}>
            {/* Initial isJMPC AND output wire */}
            <Wire ref={makeRef(wires, wires.length)}
                isSolid
                powered={isJMPCAndGate().output}
                points={[
                    isJMPCAndGate().outputPos,
                    isJMPCAndGate().outputPos.addX(initialAndWireOffset),
                    [isJMPCAndGate().outputPos.addX(initialAndWireOffset).x, isntrAndRefs["JMPC0"].inputBPos.y],
                    isntrAndRefs["JMPC0"].inputBPos
                ]}
            />
            {/* Output */}
            {jmpcMicroCode.map(sig=>
            <Wire ref={makeRef(wires, wires.length)}
                isSolid
                jointEnd
                powered={isntrAndRefs["JMPC0"].output}
                points={[
                    isntrAndRefs["JMPC0"].outputPos,
                    isntrAndRefs["JMPC0"].outputPos.addX(-20),
                    [isntrAndRefs["JMPC0"].outputPos.addX(-20).x, microCodeYPos-microWiresYOffset-15*controlSignalNameList.indexOf(sig)]
                ]}
            />
            )}
        </Node>
    </Node>)

    const flagsRegisterNode = createRef<Node>();
    const flagsRegisterRect = createRef<Rect>();
    const flagsRegister = createRef<NBitRegister>();
    view.add(<>
        <Node
            opacity={0}
            ref={flagsRegisterNode}
            scale={miniatureScale-registerMini}
            position={[generalBusDistance+flagsRegisterExtraXDist, flagsRegisterNodeYPos]}
        >
            <Rect
                ref={flagsRegisterRect}
                rotation={90}
                width={200}
                height={200}
                lineWidth={5}
                stroke={colors.TEXT_COLOR}
                radius={10}
            >
                <Txt
                    position={[0,-55]}
                    fontSize={50}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={'Flags Register'}
                />
                <NBitRegister
                    position={[0,35]}
                    ref={flagsRegister}
                    numBits={2}
                    input={()=>enableAdder() && didOverflow()?"01":"00"}
                    load={enableAdder}
                />
            </Rect>
        </Node>
    </>)
    flagsRegisterRect().width((flagsRegisterRect().children()[0] as Txt).width()+30)

    const overflowIOPos = new Vector2(rippleAdders[0].carryOutPos.x,rippleAdders[0].carryOutPos.y-150)
    flagsRegisterNode().add(
        <>
            {/* From overflow */}
            <Wire
                ref={makeRef(wires, wires.length)}
                isSolid
                powered={didOverflow}
                points={[
                    betweenParents(overflowIOPos, rippleAdder(), flagsRegisterNode()),
                    [betweenParents(overflowIOPos, rippleAdder(), flagsRegisterNode()).x, fromWorld(flagsRegister().getInputPos(0), flagsRegisterNode()).y],
                    fromWorld(flagsRegister().getInputPos(0), flagsRegisterNode()),
                ]}
            />
            {/* From flags register to JMPC instr */}
            <Wire
                ref={makeRef(wires, wires.length)}
                isSolid
                powered={()=>flagsRegister().output()[overflowFlagBitIndex]=="1"}
                points={[
                    fromWorld(flagsRegister().getOutputPos(0), flagsRegisterNode()),
                    fromWorld(flagsRegister().getOutputPos(0).addX(70), flagsRegisterNode()),
                    fromWorld(flagsRegister().getOutputPos(0).add([70, 480]), flagsRegisterNode()),
                    fromWorld(flagsRegister().getOutputPos(0).add([-550, 480]), flagsRegisterNode()),
                    [
                        fromWorld(flagsRegister().getOutputPos(0).addX(-550), flagsRegisterNode()).x,
                        betweenParents(isntrAndRefs["JMPC0"].inputAPos, controlLogic(), flagsRegisterNode()).y,
                    ],
                    betweenParents(isntrAndRefs["JMPC0"].inputAPos, controlLogic(), flagsRegisterNode()),
                ]}
            />
        </>
    )
    moveWiresToBottom();
    flagsRegisterNode().moveToBottom();

    yield* jmpcNode().opacity(1,1)
    yield* beginSlide('JMPC instruction')
    yield* flagsRegisterNode().opacity(1,1)
    yield* beginSlide('flags register')
    /**
     * End JMPC instruction
     */

    const setControlSignalLogic = (step:number, instruction: number) => {
        if (step == 0) return;
        step -= 1 // 0 indexed
        if (step < commonMicroCodeSplit.length) {
            const sigs = commonMicroCodeSplit[step]
            sigs.forEach(v=> controlSignalMap[v](true))
            return
        }
        step -= commonMicroCode.length
        const instructionName = instructionMap[instruction]
        if (basicInstrToMicroCode[instructionName]) {
            if (step >= basicInstrToMicroCode[instructionName].length) return
            const sigs = basicInstrToMicroCode[instructionName][step].split(" ")
            sigs.forEach(v=>{
                controlSignalMap[v](true);
            })
            return
        }
        if (instructionName == "MOV" && step == 0) {
            const args = instructionRegister().output().slice(bits)
            movSignals.forEach((v,i)=>{
                if (args[movRegBitMap[v]] == "1") {
                    controlSignalMap[v](true)
                }
            })
        }
        if (instructionName == "JMPC" && step == 0 && flagsRegister().output()[overflowFlagBitIndex] == "1") {
            
            jmpcMicroCode.forEach((v,i)=>{
                controlSignalMap[v](true)
            })
        }
    }
    // clock stuff for actual running of code
    const controlClockHandler = () => {
        if (!clockEnable() || haltEnable()){
            return
        }
        if (!clock()) {
            // reset control signals
            controlSignalNameList.forEach(v=> controlSignalMap[v](false))
            busSignals.map(v=>v())
            controlSignalNameList.forEach(v=>{if (lazyLoadingFixes[v]) lazyLoadingFixes[v]()})

            let out = controlMicroCounter().output()
            let num = parseInt(out,2)

            num += 1;
            let strNum = num.toString(2)
            controlMicroCounter().input(strNum.padStart(miniCounterBitsIn, "0"))
            if (counterMiniDecoder().output()[decoderOutBits-1] == "1") {
                controlMicroCounter().input("0".repeat(miniCounterBitsIn))
            }
            controlMicroCounter().load(true)
            controlMicroCounter().output()
            
            // Handle control logic signals
            let step = parseInt(controlMicroCounter().output(), 2)
            let inst = parseInt(instructionRegister().output().slice(0,bits), 2)
            setControlSignalLogic(step, inst)
            busSignals.map(v=>v())
            controlSignalNameList.forEach(v=>{if (lazyLoadingFixes[v]) lazyLoadingFixes[v]()})
        } else {
            controlMicroCounter().load(false)
        }
    }


    function* handleClock() {
        let pcNum = parseInt(programCounter().output(), 2)
        yield scrollRamToAddress(pcNum, clockSeconds/2)
        yield ramTable().select(pcNum, clockSeconds/2)
        initialClockHandler()
        controlClockHandler()
    }
    cancel(bgRunClock)
    let clockOnAndOffs = 0
    bgRunClock = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* waitFor(clockSeconds)
        yield* handleClock()
        clockOnAndOffs++
    })

    const loadProgram = (program: string[]) => {
        let data = Array.from(ramTable().columnData())
        program.forEach((v,i)=> data[i][2] = v)
        ramTable().columnData(data)
    }

    // Calculate Fibonacci 
    loadProgram([
        // Initialization
        "SETA 0",
        "STOREA 31",
        "SETA 36",
        "STOREA 32",
        "SETA 1",
        "STOREA 30",
        // Increase mem counter
        "LOADB 32",
        "STORETB",
        "SETA 1",
        "ADD",
        "STOREA 32",
        // Get next fibonacci number
        "LOADA 30",
        "LOADB 31",
        "STOREA 31",
        "ADD",
        "STOREA 30",
        // Handle jumps
        "JMPC 18",
        "JMP 6",
        "HALT",
    ])

    yield* beginSlide('program loaded')
    clockHz = 20
    clockSeconds = 1/clockHz/2
    clockEnable(true)
    yield* waitFor(1941/2/clockHz)
    yield* beginSlide('stopping point')

    yield* beginSlide("the next one")
    
    const countChildren = (node: Node) => {
        let list = [node]
        let count = 0

        while (count < list.length){
            list[count].children().forEach(c => {
                list.push(c)
            })
            count++
        }
        return count
    }
    log.info("Num Children: "+countChildren(view).toString())
    cancel(bgAnimateWires);
    cancel(bgRunClock);
});