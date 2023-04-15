import {Circle, NodeProps, Node, Txt, Spline, Rect, Knot} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Vector2 } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export interface XorGateProps extends NodeProps {
    // properties
    inputA?: SignalValue<boolean> // This could just be inputs[]
    inputB?: SignalValue<boolean>
    isXNOR?: SignalValue<boolean>
  }
  
export class XorGate extends Node {
    // implementation
    @initial(false)
    @signal()
    public declare inputA: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare inputB: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare isXNOR: SimpleSignal<boolean, this>;
    public output: SimpleSignal<boolean, this> = createSignal(() => {
        let out = this.inputA() != this.inputB()
        return this.isXNOR() ? !out : out
    });
    private readonly getOutputPos = () => this.isXNOR() ? new Vector2(0,-35-sizes.NOT_CIRCLE_SIZE) : new Vector2(0,-35)
    public readonly inputAPos: Vector2 = new Vector2(-22,48).transformAsPoint(this.localToWorld());
    public readonly inputBPos: Vector2 = new Vector2(22,48).transformAsPoint(this.localToWorld());
    public readonly outputPos: Vector2 = this.getOutputPos().transformAsPoint(this.localToWorld());
    private readonly xorLineGap = 15;

    public constructor(props?: XorGateProps) {
        super({
            ...props,
        })
        this.add(
            <>
            {/* Test Rect for sizing purposes */}
            {/* <Rect fill="#ffffff" width={120} height={120}/> */}
            <Spline
                fill={colors.GATE_COLOR}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineCap="round"
                smoothness={0.3}
                closed
            >
                <Knot
                    position={[0, -40]}
                    startHandle={[0, 0]}
                />
                <Knot position={[40,  0]}/>
                <Knot
                    position={[44, 55]}
                    startHandle={[0, 0]}
                />
                <Knot position={[0, 45]}/>
                <Knot
                    position={[-44, 55]}
                    startHandle={[0, 0]}
                />
                <Knot  position={[-40, 0]}/>
            </Spline>
            <Spline
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineCap="round"
                smoothness={0.3}
            >
                <Knot position={[44, 55 + this.xorLineGap]}/>
                <Knot position={[0, 45 + this.xorLineGap]}/>
                <Knot position={[-44, 55 + this.xorLineGap]}/>
            </Spline>
            {(this.isXNOR() &&
                <Circle
                    fill={colors.GATE_COLOR}
                    size={sizes.NOT_CIRCLE_SIZE}
                    y={-48}
                    lineWidth={sizes.WIRE_WIDTH}
                    stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                />
            )}
            <Txt
                text={this.isXNOR() ? "XNOR": "XOR"}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                fontSize={20}
                fontWeight={700}
                y={17}
            />
            </>
        );
    }
}
