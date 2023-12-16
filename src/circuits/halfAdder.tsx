import { NodeProps, Node, Txt, Rect} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Vector2 } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export interface HalfAdderProps extends NodeProps {
    // properties
    inputA?: SignalValue<boolean>
    inputB?: SignalValue<boolean>
  }
  
export class HalfAdder extends Node {
    // implementation
    @initial(false)
    @signal()
    public declare inputA: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare inputB: SimpleSignal<boolean, this>;
    public sum: SimpleSignal<boolean, this> = createSignal(() => this.inputA() != this.inputB());
    public carry: SimpleSignal<boolean, this> = createSignal(() => this.inputA() && this.inputB());
    public readonly inputAPos: Vector2 = new Vector2(-50,45).transformAsPoint(this.localToWorld());
    public readonly inputBPos: Vector2 = new Vector2(50,45).transformAsPoint(this.localToWorld());
    public readonly sumPos: Vector2 =  new Vector2(50,-45).transformAsPoint(this.localToWorld());
    public readonly carryPos: Vector2 =  new Vector2(-50,-45).transformAsPoint(this.localToWorld());

    public constructor(props?: HalfAdderProps) {
        super({
            ...props,
        })
        this.add(
            <>
            <Rect
                fill={colors.GATE_COLOR}
                width={150}
                height={90}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>(this.inputA() || this.inputB()) ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineJoin="round"
            />
                <Txt
                    text={"Half Adder"}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.DEFAULT_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
            </>
        );
    }
}
