import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {beginSlide, createRef, makeRef} from '@motion-canvas/core/lib/utils';
import { NotGate } from '../basics/not';
import { AndGate } from '../basics/and';
import { Wire } from '../basics/wire';
import {all, waitFor} from '@motion-canvas/core/lib/flow';
import {BACKGROUND_COLOR} from '../globalColors'
import { loop } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { createSignal } from '@motion-canvas/core/lib/signals';
import { Txt } from '@motion-canvas/2d/lib/components';
export default makeScene2D(function* (view) {
  const firstNot = createRef<NotGate>();
  const andGate = createRef<AndGate>();
  const wires: Wire[] = [];
  const firstInput = createSignal(true)
  const secondInput = createSignal(true)

  const testXOffset = -100;
  const testYOffset = -50;

  view.fill(BACKGROUND_COLOR);
  view.add(
    <>
      <NotGate
        ref={firstNot}
        x={0+ testXOffset}
        y={0+ testYOffset}
        rotation={90}
        inputA={firstInput}
      />
      <AndGate
        ref={andGate}
        x={200 + testXOffset}
        y={100 + testYOffset}
        rotation={90}
        inputA={firstNot().output}
        inputB={secondInput}
      />
      
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={firstInput}
        points={[
          [-120 + testXOffset, 100 + testYOffset],
          [-120 + testXOffset, -100 + testYOffset]]}
      />
      <Wire
        ref={makeRef(wires, wires.length)}
        jointStart
        powered={firstInput}
        points={[
          [-120+testXOffset, 0 + testYOffset],
          firstNot().inputPos
        ]}
      />

      <Wire
        ref={makeRef(wires, wires.length)}
        powered={firstNot().output}
        points={[
          firstNot().outputPos,
          [100 + testXOffset, 0 + testYOffset],
          [100 + testXOffset,andGate().inputAPos.y],
          andGate().inputAPos
        ]}
      />
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={secondInput}
        points={[
          [100 + testXOffset, 200 + testYOffset],
          [100 + testXOffset,andGate().inputBPos.y],
          [100 + testXOffset,andGate().inputBPos.y],
          andGate().inputBPos
        ]}
      />

      <Wire
        ref={makeRef(wires, wires.length)}
        jointEnd
        powered={andGate().output}
        points={[
          andGate().outputPos,
          [andGate().outputPos.x+50,100 + testYOffset]
        ]}/>
    </>
  );
  // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
  wires.reverse().forEach(v => v.moveToBottom());

  const bgAnimateWires = yield loop(10000, function* (){
    yield* all(...wires.map(w=>w.animate()))
  })
  const flipBit = yield loop(10000, function* (){
    
    yield* waitFor(2)
    firstInput(!firstInput())
    yield* waitFor(2)
    secondInput(!secondInput())
    yield* waitFor(2)
    firstInput(!firstInput())
    secondInput(!secondInput())
  })
  yield* waitFor(12)
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