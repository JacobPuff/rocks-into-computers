import {Circle, Polygon, NodeProps, Node, Txt} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Vector2 } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export interface NotGateProps extends NodeProps {
    // properties
    inputA?: SignalValue<boolean>
  }
  
export class NotGate extends Node {
    // implementation
    @initial(false)
    @signal()
    public declare inputA: SimpleSignal<boolean, this>;
    public output: SimpleSignal<boolean, this> = createSignal(() => !this.inputA());
    public readonly inputPos: Vector2 = new Vector2(0,50).transformAsPoint(this.localToWorld());
    public readonly outputPos: Vector2 = new Vector2(0,-54).transformAsPoint(this.localToWorld());

    public constructor(props?: NotGateProps) {
        super({
            ...props,
        })
        this.add(
            <>
            {/* Test Rect for sizing purposes */}
            {/* <Rect fill="#ffffff" width={120} height={120}/> */}
            <Polygon
                fill={colors.GATE_COLOR}
                y={20}
                size={120}
                sides={3}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineJoin="round"
            />
            <Circle
                stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                size={sizes.NOT_CIRCLE_SIZE}
                y={-45}
                fill={colors.GATE_COLOR}
                lineWidth={sizes.WIRE_WIDTH}
            />
            <Txt
                text="NOT"
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                fontSize={sizes.DEFAULT_FONT_SIZE}
                fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                y={25}
            />
            </>
        );
    }
}
