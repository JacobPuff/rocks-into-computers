import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Layout, Txt } from '@motion-canvas/2d/lib/components';
import {Reference, beginSlide, createRef, makeRef, range, useLogger} from '@motion-canvas/core/lib/utils';
import { AndGate } from '../basics/and';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
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
    const wires: Wire[] = [];
    const stepsList: Txt[] = [];
    // Negative number values are in ones compliment
    const binaryNums: Record<string, Txt> = {};
    const binaryId = (id: string) => makeRef(binaryNums, id);
    const decimalNums: Record<string, Txt> = {};
    const decimalId = (id: string) => makeRef(decimalNums, id);
    // const numberGroups: Record<string, Txt> = {};
    // const numberGroupId = (id: string) => makeRef(numberGroups, id);

    const makeBinaryNum = (id: string, text:string,  x: number = 0, y: number = 0)=>{
        return (
        <Txt
            ref={binaryId(id)}
            position={[x,y]}
            fontSize={50}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            opacity={0}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={text}
        />)
    }
    const makeDecimalNum = (id:string, text:string, binaryTxt: Txt, x: number = 0, y: number = 0)=>{
        return (
        <Txt
            ref={decimalId(id)}
            position={()=>[binaryTxt.position.x()-(70*binaryTxt.scale.x()), binaryTxt.position.y()]}
            offsetX={1}
            fontSize={50}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            opacity={binaryTxt.opacity}
            scale={binaryTxt.scale}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            text={text}
        />)
    }
    const makeStepsText = (text:string, x:number, y:number) =>{
       return (
        <Txt
            ref={makeRef(stepsList, stepsList.length)}
            position={[x,y]}
            offsetX={-1}
            fontSize={50}
            fontWeight={sizes.DEFAULT_FONT_WEIGHT}
            opacity={0}
            fill={colors.TEXT_COLOR}
            fontFamily="Helvetica"
            fontStyle="italic"
            text={text}
        />)
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
                text={"But what about subtraction?"}
            />
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

    const getYPos = (i)=>100+i*50
    const numbersXPos = -400
    yield* beginSlide("subtraction intro");
    const bitLength = 4
    const insertNumberDelay = 0.1
    const stepsBaseX = 300
    const getStepsYPos = ()=>-50+(80*(stepsList.length))
    view.add(range(6).map((num, i)=>makeBinaryNum(num.toString(), num.toString(2).padStart(bitLength, "0"), numbersXPos, getYPos(i))))
    view.add(range(6).map((num, i)=>makeDecimalNum(num.toString(),num.toString()+" =", binaryNums[num])))
    view.add(makeStepsText("Steps:", stepsBaseX,getStepsYPos()))
    yield* all(
        ...Object.keys(binaryNums).map((key, i)=> delay(insertNumberDelay*i, binaryNums[key].opacity(1, 0.3)))
    )
    yield* stepsList[stepsList.length-1].opacity(1,0.3)
    yield* beginSlide("positive numbers shown, steps started");
    yield* all(
        binaryNums["1"].position.x(0, 1),
        delay(0.3,binaryNums["1"].position.y(0, 1)),
        delay(0.3,binaryNums["1"].scale(1.3, 1)),
    )
    yield* beginSlide("pull out a number")
    const bigScale = 1.3
    view.add(makeBinaryNum("-1","1110", 0,-70))
    view.add(makeDecimalNum("-1", "-1 =", binaryNums["-1"]))
    view.add(makeStepsText("Flip bits", stepsBaseX+50,getStepsYPos()))
    binaryNums["-1"].scale(bigScale)
    yield* all(
        binaryNums["-1"].opacity(1,1),
        stepsList[stepsList.length-1].opacity(1,1),
    )
    yield* beginSlide("flip bits")
    yield* all (
        binaryNums["1"].scale(1,1),
        binaryNums["-1"].scale(1,1),
        binaryNums["1"].position.y(getYPos(1),1),
        binaryNums["-1"].position.y(getYPos(-1-1),1),// this is accounting for -0
        delay(0.3, binaryNums["1"].position.x(numbersXPos,1)),
        delay(0.3, binaryNums["-1"].position.x(numbersXPos,1)),
    )
    // make -0 separately, to easily not remake -1
    view.add(makeBinaryNum("-0","1111",numbersXPos, getYPos(-1)))
    view.add(makeDecimalNum("-0", "-0 =", binaryNums["-0"]))
    let log = useLogger()
    view.add(range(-4).map((num, i)=>{
        num = num-2
        let binaryStr = (num*-1).toString(2).padStart(bitLength, "0")
        let intermediate = binaryStr.replaceAll("1","X")
        let flipped = intermediate.replaceAll("0","1")
        flipped = flipped.replaceAll("X","0")
        log.debug(flipped +" "+ getYPos(i*-1-3))
        return makeBinaryNum(num.toString(), flipped, numbersXPos, getYPos(i*-1-3))
    }))
    view.add(range(-4).map((num, i)=>makeDecimalNum((num-2).toString(), (num-2).toString()+" =", binaryNums[num-2])))
    yield binaryNums["-0"].opacity(1,0.3)
    yield* all(
        slideTitle().text("One's Compliment",1),
        ...range(-4).map((num, i)=>delay(insertNumberDelay*(i+1),binaryNums[(num-2).toString()].opacity(1,0.3)))
    )
    yield* beginSlide("put numbers back and reveal ones compliment list")

    yield* decimalNums["-0"].opacity(0,0.3)
    // This will fill in the gap when decimals move
    view.add(makeDecimalNum("-6", "-6 =", binaryNums["-5"]))
    decimalNums["-6"].opacity(0)
    yield* all(
        ...range(-5).map((num, i)=>decimalNums[(num-1).toString()].position.y(getYPos(i*-1-1),0.3))
    )
    yield* decimalNums["-6"].opacity(1,0.3)
    view.add(makeStepsText("Add one", stepsBaseX+50,getStepsYPos()))
    yield* stepsList[stepsList.length-1].opacity(1,1)
    yield* slideTitle().text("Two's Compliment",1)
    yield* beginSlide("remove -0 and reveal twos compliment")
    cancel(bgAnimateWires);
    cancel(bgSelectRows);
});