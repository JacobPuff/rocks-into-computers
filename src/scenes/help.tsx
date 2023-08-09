import {beginSlide, makeRef, createRef, useLogger} from '@motion-canvas/core/lib/utils';
import { waitFor, all, loop,  } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import { AndGate } from '../basics/and';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { OrGate } from '../basics/or';
import { createSignal } from '@motion-canvas/core/lib/signals';

export default makeScene2D(function* (view) {
  const wires: Wire[] = []
  const andGate = createRef<AndGate>();
  const orGate = createRef<OrGate>();
  const powerA = createSignal(false)
  const powerB = createSignal(false)
  let loopedToAnd = false
  
  let log = useLogger()
  const feedbackLoopStuff = ()=>{
    loopedToAnd = orGate().output();
    log.debug("loopedToAnd signal: " + loopedToAnd)
    andGate().inputA(loopedToAnd)
    return loopedToAnd
  }

  view.fill("#2c2938");
  view.add (<>
      <OrGate ref={orGate} inputA={()=>andGate() ? andGate().output() : false} inputB={powerB}/>
      <AndGate inputA={loopedToAnd} inputB={powerA} ref={andGate} position={[orGate().inputAPos.x, orGate().inputAPos.y+100]}/>
      {/* AND to OR */}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={andGate().output} points={[andGate().outputPos, orGate().inputAPos]}/>
      {/* A to AND */}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={powerA} points={[[andGate().inputBPos.x,andGate().inputAPos.y+100], andGate().inputBPos]}/>
      {/* B to OR */}
      <Wire 
        ref={makeRef(wires, wires.length)}
        powered={powerB} points={[[orGate().inputBPos.x+100,orGate().inputBPos.y+50],[orGate().inputBPos.x,orGate().inputBPos.y+50], orGate().inputBPos]}/>
      {/* Feedback signal */}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={orGate().output}
        points={[
            orGate().outputPos,
            [orGate().outputPos.x,orGate().outputPos.y-30],
            [orGate().outputPos.x-100,orGate().outputPos.y-30],
            [orGate().outputPos.x-100,andGate().inputAPos.y+30],
            [andGate().inputAPos.x,andGate().inputAPos.y+30],
            andGate().inputAPos
        ]}
      />
      
      <VisualIO name="A" position={[andGate().inputBPos.x,andGate().inputBPos.y+100]} powered={powerA}/>
      <VisualIO name="B" position={[orGate().inputBPos.x+100,orGate().inputBPos.y+50]} powered={powerB}/>
  </>)
  wires.map(w=>w.moveToBottom())
  const bgAnimateWires = yield loop(99999, function* (){
    yield* all(...wires.map(w=>w.animate()))
  })

  yield* waitFor(0.5)
  powerB(true)
  feedbackLoopStuff()
  yield* waitFor(1)
  powerA(true)
  feedbackLoopStuff()
  yield* waitFor(1)
  powerB(false)
  feedbackLoopStuff()
  yield* waitFor(1)
  powerA(false)
  feedbackLoopStuff()
  yield* waitFor(1)
  powerB(true)
  feedbackLoopStuff()

  yield* beginSlide("help");
  cancel(bgAnimateWires);
});