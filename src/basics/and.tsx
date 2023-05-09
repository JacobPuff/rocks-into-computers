import {Circle, NodeProps, Node, Txt, Rect} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Vector2 } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export interface AndGateProps extends NodeProps {
    // properties
    inputA?: SignalValue<boolean> // This could just be inputs[]
    inputB?: SignalValue<boolean>
    isNAND?: SignalValue<boolean>
  }
  
export class AndGate extends Node {
    // implementation
    @initial(false)
    @signal()
    public declare inputA: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare inputB: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare isNAND: SimpleSignal<boolean, this>;
    public output: SimpleSignal<boolean, this> = createSignal(() => {
        let andOut = this.inputA() && this.inputB()
        return this.isNAND() ? !andOut : andOut
    });
    private readonly getOutputPos = () => this.isNAND() ? new Vector2(0,-35-sizes.NOT_CIRCLE_SIZE) : new Vector2(0,-35)
    public readonly inputAPos: Vector2 = new Vector2(-22,55).transformAsPoint(this.localToWorld());
    public readonly inputBPos: Vector2 = new Vector2(22,55).transformAsPoint(this.localToWorld());
    public readonly outputPos: Vector2 = this.getOutputPos().transformAsPoint(this.localToWorld());

    public constructor(props?: AndGateProps) {
        super({
            ...props,
        })
        this.add(
            <>
            {/* Test Rect for sizing purposes */}
            {/* <Rect fill="#ffffff" width={120} height={120}/> */}
            <Rect
                fill={colors.GATE_COLOR}
                y={31}
                width={90}
                height={50}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineJoin="round"
            />
            <Circle
                fill={colors.GATE_COLOR}
                size={90}
                y={10}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                startAngle={180}
            />
            {(this.isNAND() &&
                <Circle
                    fill={colors.GATE_COLOR}
                    size={sizes.NOT_CIRCLE_SIZE}
                    y={-45}
                    lineWidth={sizes.WIRE_WIDTH}
                    stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                />
            )}
            <Txt
                text={this.isNAND() ? "NAND": "AND"}
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                fontSize={sizes.DEFAULT_FONT_SIZE}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                y={17}
            />
            </>
        );
    }
}
