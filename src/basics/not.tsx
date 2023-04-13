import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Circle,Polygon, NodeProps, Node, Spline, Knot, Txt, Rect} from '@motion-canvas/2d/lib/components';
import { createRef } from '@motion-canvas/core/lib/utils';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 
import { Vector2 } from '@motion-canvas/core/lib/types';

export interface NotGateProps extends NodeProps {
    // properties
    inputA?: SignalValue<boolean>
  }
  
export class NotGate extends Node {
    // implementation
    private readonly notCircle = createRef<Circle>();
    private readonly notPolygon = createRef<Polygon>();
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
                ref={this.notPolygon}
                fill={colors.GATE_COLOR}
                y={20}
                size={120}
                sides={3}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineJoin="round"
            />
            <Circle
                ref={this.notCircle}
                stroke={()=>this.output() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                size={20}
                y={-45}
                fill={colors.GATE_COLOR}
                lineWidth={sizes.WIRE_WIDTH}
            />
            <Txt
                text="NOT"
                fill={colors.TEXT_COLOR}
                fontFamily="Helvetica"
                fontSize={20}
                fontWeight={700}
                y={25}
            />
            </>
        );
    }
}
