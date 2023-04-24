import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt } from '@motion-canvas/2d/lib/components';
import {Reference, beginSlide, createRef, makeRef} from '@motion-canvas/core/lib/utils';
import { OrGate } from '../basics/or';
import { XorGate } from '../basics/xor';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import {all, any, waitFor} from '@motion-canvas/core/lib/flow';
import {slideTransition} from '@motion-canvas/core/lib/transitions';
import {Direction, Vector2} from '@motion-canvas/core/lib/types';
import { loop } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
    const slideTitle = createRef<Txt>();
    const truthTables: TruthTable[] = []
    const orGate = createRef<OrGate>();
    const norGate = createRef<OrGate>();
    const xorGate = createRef<XorGate>();
    const xnorGate = createRef<XorGate>();

    const orUnit= createRef<Layout>();
    const norUnit= createRef<Layout>();
    const xorUnit= createRef<Layout>();
    const xnorUnit= createRef<Layout>();

    const orInputA = createSignal(()=>truthTables[0].outputRow()[0] == 1)
    const orInputB = createSignal(()=>truthTables[0].outputRow()[1] == 1)
    const norInputA = createSignal(()=>truthTables[1].outputRow()[0] == 1)
    const norInputB = createSignal(()=>truthTables[1].outputRow()[1] == 1)

    
    const xorInputA = createSignal(()=>truthTables[2].outputRow()[0] == 1)
    const xorInputB = createSignal(()=>truthTables[2].outputRow()[1] == 1)
    const xnorInputA = createSignal(()=>truthTables[3].outputRow()[0] == 1)
    const xnorInputB = createSignal(()=>truthTables[3].outputRow()[1] == 1)
    const wires: Wire[] = [];

    function getUnitBody(gateRef: Reference<any>, inputA:SimpleSignal<boolean,void>, inputB:SimpleSignal<boolean,void>) {
        return (<>
            <VisualIO
                powered={inputA}
                name={"A"}
                position={[gateRef().inputAPos.x-20,150]}
            />
            <VisualIO
                powered={inputB}
                name={"B"}
                position={[gateRef().inputBPos.x+20,150]}
            />
            <VisualIO
                powered={gateRef().output}
                name={"Out"}
                position={[-100,-150]}
            />
            {/* Input A Wire */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={inputA}
                points={[
                    [gateRef().inputAPos.x-20,150],
                    [gateRef().inputAPos.x-20,90],
                    [gateRef().inputAPos.x,90],
                    gateRef().inputAPos
                ]}
            />
            {/* Input B Wire */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={inputB}
                points={[
                    [gateRef().inputBPos.x+20,150],
                    [gateRef().inputBPos.x+20,90],
                    [gateRef().inputBPos.x,90],
                    gateRef().inputBPos
                ]}
            />
            {/* Output Wire */}
            <Wire
                ref={makeRef(wires, wires.length)}
                powered={gateRef().output}
                points={[
                    gateRef().outputPos,
                    [-100,-150]
                ]}
            />
        </>)
    }

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
                text={"The OR Gate"}
            />
            <Layout ref={orUnit}>
                <TruthTable
                    ref={makeRef(truthTables, truthTables.length)}
                    position={[100,0]}
                    columnNames={["A", "B", "Out"]}
                    columnData={[
                        [0,0,0],
                        [1,0,1],
                        [0,1,1],
                        [1,1,1],
                    ]}
                />
                <OrGate
                    ref={orGate}
                    position={[-100,-20]}
                    inputA={orInputA}
                    inputB={orInputB}
                />
                
                {getUnitBody(orGate, orInputA, orInputB)}
            </Layout>

            <Layout ref={norUnit} position={[300,0]} opacity={0}>
                <TruthTable
                    ref={makeRef(truthTables, truthTables.length)}
                    position={[100,0]}
                    columnNames={["A", "B", "Out"]}
                    columnData={[
                        [0,0,1],
                        [1,0,0],
                        [0,1,0],
                        [1,1,0],
                    ]}
                />
                <OrGate
                    ref={norGate}
                    isNOR={true}
                    position={[-100,-20]}
                    inputA={norInputA}
                    inputB={norInputB}
                />
                
                {getUnitBody(norGate, norInputA, norInputB)}
            </Layout>

            <Layout ref={xorUnit} position={[300,0]} opacity={0}>
                <TruthTable
                    ref={makeRef(truthTables, truthTables.length)}
                    position={[100,0]}
                    columnNames={["A", "B", "Out"]}
                    columnData={[
                        [0,0,0],
                        [1,0,1],
                        [0,1,1],
                        [1,1,0],
                    ]}
                />
                <XorGate
                    ref={xorGate}
                    position={[-100,-20]}
                    inputA={xorInputA}
                    inputB={xorInputB}
                />
                {getUnitBody(xorGate, xorInputA, xorInputB)}
            </Layout>

            <Layout ref={xnorUnit} position={[300,0]} opacity={0}>
                <TruthTable
                    ref={makeRef(truthTables, truthTables.length)}
                    position={[100,0]}
                    columnNames={["A", "B", "Out"]}
                    columnData={[
                        [0,0,1],
                        [1,0,0],
                        [0,1,0],
                        [1,1,1],
                    ]}
                />
                <XorGate
                    ref={xnorGate}
                    isXNOR={true}
                    position={[-100,-20]}
                    inputA={xnorInputA}
                    inputB={xorInputB}
                />
                {getUnitBody(xnorGate, xnorInputA, xnorInputB)}
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
    yield* beginSlide("or gate");
    // Move OR, bring in NOR, update title
    yield* all(
        slideTitle().text("The NOR Gate", 1),
        orUnit().position.x(-300, 1),
        norUnit().opacity(1, 1),
    )
    yield* beginSlide("nor gate");

    // Fade out NOR and then remove it
    yield* any(
        norUnit().position.y(500,1),
        norUnit().opacity(0,0.5),
    )
    norUnit().remove()
  
    // Fade in XOR, update title
    yield* all(
        slideTitle().text("The XOR Gate", 1),
        xorUnit().opacity(1, 0.5),
    )
    yield* beginSlide("xor gate");

    // Fade out OR and remove it, move XOR to its spot
    yield* all(
        orUnit().position.y(500,1),
        orUnit().opacity(0,0.5),
        xorUnit().position.x(-300, 1),
    )
    orUnit().remove()
    // Fade in XNOR and update title
    yield* all(
        slideTitle().text("The XNOR Gate", 1),
        xnorUnit().opacity(1,1),
    )
    yield* beginSlide("xnor gate");
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});