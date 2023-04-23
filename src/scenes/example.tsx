import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Circle, NodeProps, Node, Txt, Spline, Rect, Knot, Layout} from '@motion-canvas/2d/lib/components';
import { range, useLogger } from '@motion-canvas/core/lib/utils';
import {beginSlide, createRef, makeRef} from '@motion-canvas/core/lib/utils';
import { NotGate } from '../basics/not';
import { AndGate } from '../basics/and';
import { OrGate } from '../basics/or';
import { XorGate } from '../basics/xor';
import { VisualIO } from '../basics/visualIO';
import { Wire } from '../basics/wire';
import { TruthTable } from '../basics/truthtable';
import {all, waitFor} from '@motion-canvas/core/lib/flow';
import {BACKGROUND_COLOR} from '../globalColors'
import { loop } from '@motion-canvas/core/lib/flow';
import { cancel } from '@motion-canvas/core/lib/threading';
import { createSignal } from '@motion-canvas/core/lib/signals';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export default makeScene2D(function* (view) {
  const firstNot = createRef<NotGate>();
  const xorGate = createRef<XorGate>();
  const andGate = createRef<AndGate>();
  const truthTable = createRef<TruthTable>();
  const wires: Wire[] = [];
  const firstInput = createSignal(()=>truthTable().outputRow()[0] == 1)
  const secondInput = createSignal(()=>truthTable().outputRow()[1] == 1)

  const testXOffset = -110;
  const testYOffset = -50;
  view.fill(BACKGROUND_COLOR);
  view.add(
    <>
      <TruthTable
        ref={truthTable}
        x={-250+ testXOffset}
        y={-50+ testYOffset}
        columnNames={["A", "B", "Output"]}
        columnData={[
          [0,0,0],
          [1,1,0],
          [1,0,0],
          [0,1,1],
        ]}
      />
      <NotGate
        ref={firstNot}
        x={0+ testXOffset}
        y={0+ testYOffset}
        rotation={90}
        inputA={firstInput}
      />
      <XorGate
        ref={xorGate}
        x={170 + testXOffset}
        y={100 + testYOffset}
        rotation={90}
        isXNOR={false}
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
        inputB={xorGate().output}
      />
      <VisualIO
        position={[-120 + testXOffset, 220 + testYOffset]}
        powered={firstInput}
        name={"A"}
      />
      <VisualIO
        position={[70 + testXOffset, 220 + testYOffset]}
        powered={secondInput}
        name={"B"}
      />
      <VisualIO
        position={[andGate().outputPos.x+120,andGate().outputPos.y]}
        powered={andGate().output}
        name={"Output"}
      />
      
      {/* firstInput base wire */}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={firstInput}
        points={[
          [-120 + testXOffset, 200 + testYOffset],
          [-120 + testXOffset, 0 + testYOffset]]}
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
          [-120 + testXOffset,xorGate().inputAPos.y],
          [100 + testXOffset,xorGate().inputAPos.y],
          xorGate().inputAPos
        ]}
      />

      {/* secondInput base wire, OR gate input B*/}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={secondInput}
        points={[
          [70 + testXOffset, 200 + testYOffset],
          [70 + testXOffset,xorGate().inputBPos.y],
          [70 + testXOffset,xorGate().inputBPos.y],
          xorGate().inputBPos
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
        powered={xorGate().output}
        points={[
          xorGate().outputPos,
          [250 + testXOffset,  xorGate().outputPos.y],
          [250 + testXOffset, andGate().inputBPos.y],
          andGate().inputBPos
        ]}
      />
      {/* AND gate output */}
      <Wire
        ref={makeRef(wires, wires.length)}
        powered={andGate().output}
        points={[
          andGate().outputPos,
          [andGate().outputPos.x+70,andGate().outputPos.y]
        ]}
      />
    </>
  );
  // Reversed so the typical heirarchy is consistent between wires. Defined first means on bottom.
  wires.reverse().forEach(v => v.moveToBottom());

  const bgAnimateWires = yield loop(10000, function* (){
    yield* all(...wires.map(w=>w.animate()))
  })
  yield* waitFor(1)
  const bgSelectRows = yield loop(10000, function* (){
    let nextRow = (truthTable().currentOutputLine()+1) % truthTable().columnData().length
    yield* truthTable().select(nextRow, sizes.TRUTH_TABLE_DEFAULT_SPEED)
    yield* waitFor(1)
  })

  yield* waitFor(11)
  yield* beginSlide("title");
  cancel(bgAnimateWires);
  cancel(bgSelectRows);
});


/*
TODO:
Then the rest of the gates [check]
Visual input signals that aren't the truth table [check]
Truth table [check]
I believe the control flow at this point might be truth table > basic inputs > chaining through outputs
Truth table could later hold assembly commands? Will we get that far in the presentation?
*/