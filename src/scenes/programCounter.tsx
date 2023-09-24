import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt } from '@motion-canvas/2d/lib/components';
import {beginSlide, createRef, makeRef, range, useLogger} from '@motion-canvas/core/lib/utils';
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
import { GatedDLatch } from '../circuits/gatedDLatch';

export default makeScene2D(function* (view) {
    const slideTitle = createRef<Txt>();
    const truthTables: TruthTable[] = []
    const superInts = "⁰¹²³⁴⁵⁶⁷⁸⁹"
    let log = useLogger()
    const wires: Wire[] = [];
    const wireLayouts: Record<string, Layout> = {};
    const circuitLayout = createRef<Layout>();
    const dLatches: GatedDLatch[] = [];
    const clock = createRef<VisualIO>();

    const latchCount = 4
    let storedValuesRaw: number[] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    let storedValues = storedValuesRaw.map(v => createSignal(v))
    //dLatches[0] is the farthest left
    const storeLooped = ()=> {
        if (dLatches.length != 0) {
            for (var i = 0; i < latchCount; i++){
                const latch = dLatches[i]
                if (!latch.enable()){ // Mimics rising edge enable detection (Should probably put that on the latch component itself...)
                    storedValuesRaw[i]=latch.notOutput()?1:0
                }
            }
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

    const latchSpacing = createSignal(200)
    const GatedDLatchWidth = 150
    const halfCounterWidth = createSignal(()=>(latchSpacing()*(latchCount-2)/2)+(GatedDLatchWidth/2))
    const clockYOffset = -100
    const clockHz = 0.5
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
                text={"Counting"}
            />
            <Layout ref={circuitLayout} scale={1.5} rotation={0} opacity={0} x={0} y={100}>
                
                {/* Clock IO */}
                <VisualIO
                    ref={clock}
                    x={()=>halfCounterWidth()+200}
                    y={clockYOffset}
                    name={"Clock"}
                    powered={false}
                />
                {/* Data inputs stuff */}
                {range(latchCount).map(idx=>
                    <GatedDLatch
                        rotation={-90}
                        x={()=>(idx*latchSpacing()-halfCounterWidth() )}
                        ref={makeRef(dLatches, dLatches.length)}
                        data={()=>storedValues[idx]()==1}
                    />
                )}
                <Layout ref={makeRef(wireLayouts, "initialDLatchWiresAndOutIO")}>
                    {dLatches.map((latch, idx)=>
                        <>
                            {/* Looped notOuput */}
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                powered={latch.notOutput}
                                points={[
                                    latch.notOutputPos(),
                                    [latch.notOutputPos().x-30, latch.notOutputPos().y],
                                    [latch.notOutputPos().x-30, latch.notOutputPos().y-50],
                                    [latch.dataPos().x+20, latch.notOutputPos().y-50],
                                    [latch.dataPos().x+20, latch.dataPos().y],
                                    latch.dataPos()
                                ]}
                            />
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                powered={latch.output}
                                points={[
                                    latch.outputPos(),
                                    [latch.outputPos().x-50, latch.outputPos().y],
                                    [latch.outputPos().x-50, latch.outputPos().y+100],
                                ]}
                            />
                            <VisualIO
                                name={"Out"+superInts[dLatches.length-idx]}
                                powered={latch.output}
                                position={[latch.outputPos().x-50, latch.outputPos().y+100]}
                            />
                            {idx != 0 &&
                            <Wire
                                ref={makeRef(wires, wires.length)}
                                powered={latch.notOutput}
                                jointStart
                                points={[
                                    [latch.notOutputPos().x-30, latch.notOutputPos().y],
                                    dLatches[idx-1].enablePos(),
                                ]}
                            />}
                        </>
                    )}
                </Layout>
                {/* Clock Wires */}
                <Wire
                    ref={makeRef(wires, wires.length)}
                    powered={clock().powered}
                    points={[
                        clock().position(),
                        [clock().position().x, dLatches[latchCount-1].enablePos().y],
                        dLatches[latchCount-1].enablePos()
                    ]}
                />
                <Txt
                    x={-halfCounterWidth()-200}
                    fontSize={30}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    text={()=>"Value: "+parseInt(dLatches.map(v => v.output()?"1":"0").join(""),2).toString()}
                />
            </Layout>
        </>
    );
    // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
    wires.reverse().forEach(v => v.moveToBottom());
    Object.values(wireLayouts).forEach(v=> v.moveToBottom());
    dLatches.forEach((latch, idx) => {
        if (idx != latchCount-1) {  
            latch.enable(dLatches[idx+1].notOutput)
        } else {
            latch.enable(clock().powered)
        }
    })
    const bgAnimateWires = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* all(...wires.map(w=>w.animate()))
    })
    yield* slideTransition(Direction.Right, 1);
    yield* beginSlide("counting intro");
    yield* all(
        circuitLayout().opacity(1,1),
    )
    const bgRunClock = yield loop(sizes.LOOP_LENGTH, function* (){
        yield* waitFor(1/clockHz/2)
        storeLooped() // reading stored signal so it may be updated
        clock().powered(!clock().powered())
    })
    yield* beginSlide("counter circuit")
    yield* slideTitle().text("Asynchronous Counter", 1)
    yield* beginSlide("async counter")
    yield* slideTitle().text("Program Counter", 1)
    yield* beginSlide("program counter")
    cancel(bgAnimateWires);
    cancel(bgRunClock);
});