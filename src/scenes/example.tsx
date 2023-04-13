import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {beginSlide, createRef, makeRef} from '@motion-canvas/core/lib/utils';
import { NotGate } from '../basics/not';
import { AndGate } from '../basics/and';
import { OrGate } from '../basics/or';
import { Wire } from '../basics/wire';
import {all, waitFor} from '@motion-canvas/core/lib/flow';
import {BACKGROUND_COLOR} from '../globalColors'
import { loop } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { createSignal } from '@motion-canvas/core/lib/signals';
import { Txt } from '@motion-canvas/2d/lib/components';
export default makeScene2D(function* (view) {
  const firstNot = createRef<NotGate>();
  const orGate = createRef<OrGate>();
  const andGate = createRef<AndGate>();
  const wires: Wire[] = [];
  const firstInput = createSignal(true)
  const secondInput = createSignal(true)

  const testXOffset = -150;
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
      <OrGate
        ref={orGate}
        x={170 + testXOffset}
        y={100 + testYOffset}
        rotation={90}
        isNOR={false}
        inputA={firstInput}
        inputB={secondInput}
      />
      <AndGate
        ref={andGate}
        x={350 + testXOffset}
        y={50 + testYOffset}
        rotation={90}
        isNAND={false}
        inputA={firstNot().output}
        inputB={orGate().output}
      />
      
      {/* firstInput base wire */}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={firstInput}
        points={[
          [-120 + testXOffset, 200 + testYOffset],
          [-120 + testXOffset, -100 + testYOffset]]}
      />
      {/* firstInput base wire, NOT gate input */}
      <Wire
        ref={makeRef(wires, wires.length)}
        jointStart
        powered={firstInput}
        points={[
          [-120+testXOffset, 0 + testYOffset],
          firstNot().inputPos
        ]}
      />
      {/* first Input base wire, OR gate input A */}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={firstInput}
        jointStart
        points={[
          [-120 + testXOffset,orGate().inputAPos.y],
          [100 + testXOffset,orGate().inputAPos.y],
          orGate().inputAPos
        ]}
      />

      {/* secondInput base wire, OR gate input B*/}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={secondInput}
        points={[
          [70 + testXOffset, 200 + testYOffset],
          [70 + testXOffset,orGate().inputBPos.y],
          [70 + testXOffset,orGate().inputBPos.y],
          orGate().inputBPos
        ]}
      />

      {/* AND gate inputs */}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={firstNot().output}
        points={[
          firstNot().outputPos,
          [100 + testXOffset, 0 + testYOffset],
          [250 + testXOffset, 0 + testYOffset],
          [250 + testXOffset, andGate().inputAPos.y],
          andGate().inputAPos
        ]}
      />
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={orGate().output}
        points={[
          orGate().outputPos,
          [250 + testXOffset,  orGate().outputPos.y],
          [250 + testXOffset, andGate().inputBPos.y],
          andGate().inputBPos
        ]}
      />
      {/* AND gate output */}
      <Wire
        ref={makeRef(wires, wires.length)}
        jointEnd
        powered={andGate().output}
        points={[
          andGate().outputPos,
          [andGate().outputPos.x+50,andGate().outputPos.y]
        ]}
      />
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
    yield* waitFor(2)
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