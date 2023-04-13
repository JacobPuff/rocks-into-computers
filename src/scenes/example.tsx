import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {beginSlide, createRef, makeRef} from '@motion-canvas/core/lib/utils';
import { NotGate } from '../basics/not';
import { Wire } from '../basics/wire';
import {all, waitFor} from '@motion-canvas/core/lib/flow';
import {BACKGROUND_COLOR} from '../globalColors'
import { loop } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { createSignal } from '@motion-canvas/core/lib/signals';
import { Txt } from '@motion-canvas/2d/lib/components';
export default makeScene2D(function* (view) {
  const firstNot = createRef<NotGate>();
  const secondNot = createRef<NotGate>();
  const wires: Wire[] = [];
  const input = createSignal(true)
  view.fill(BACKGROUND_COLOR);
  view.add(
    <>
      <NotGate ref={firstNot} x={0} inputA={input} rotation={90}/>
      <NotGate ref={secondNot} x={200} y={100} rotation={90} inputA={firstNot().output}/>
      
      <Wire ref={makeRef(wires, wires.length)} powered={input} points={[[-120, 100], [-120, -100]]}/>
      <Wire ref={makeRef(wires, wires.length)} jointStart powered={input} points={[[-120, 0], firstNot().inputPos]}/>
      <Wire ref={makeRef(wires, wires.length)} powered={firstNot().output} points={[firstNot().outputPos, [100, 0], [100,100], secondNot().inputPos]}/>
      <Wire ref={makeRef(wires, wires.length)} jointEnd powered={secondNot().output} points={[secondNot().outputPos, [secondNot().outputPos.x+50,100]]}/>
    </>
  );
  wires.reverse().forEach(v => v.moveToBottom());

  const bgAnimateWires = yield loop(10000, function* (){
    yield* all(...wires.map(w=>w.animate()))
  })
  const flipBit = yield loop(10000, function* (){
    
    yield* waitFor(2)
    input(!input())
  })
  yield* waitFor(4)
  yield* beginSlide("title");
  cancel(bgAnimateWires);
  cancel(flipBit);
});


/*
TODO:
Then the rest of the gates
Visual input signals that aren't the truth table
Truth table
I believe the control flow at this point might be truth table > basic inputs > chaining through outputs
Truth table could later hold assembly commands? Will we get that far in the presentation?
*/