import {Circle, NodeProps, Node, Txt, Rect} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Origin, Vector2, originToOffset } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 
import { Reference, createRef } from '@motion-canvas/core/lib/utils';

export interface FullAdderProps extends NodeProps {
    // properties
    inputA?: SignalValue<boolean>
    inputB?: SignalValue<boolean>
    carryIn?: SignalValue<boolean>
  }
  
export class FullAdder extends Node {
    // implementation
    @initial(false)
    @signal()
    public declare inputA: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare inputB: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare carryIn: SimpleSignal<boolean, this>;
    public sum: SimpleSignal<boolean, this> = createSignal(() => {
        let inputsTrue = [this.inputA(),this.inputB(),this.carryIn()].filter(v=>v === true).length
        return inputsTrue === 1 || inputsTrue === 3
    });
    public carryOut: SimpleSignal<boolean, this> = createSignal(() => {
        let inputsTrue = [this.inputA(),this.inputB(),this.carryIn()].filter(v=>v === true).length
        return inputsTrue === 2 || inputsTrue === 3
    });
    public readonly inputAPos: Vector2 = new Vector2(-50,50).transformAsPoint(this.localToWorld());
    public readonly inputBPos: Vector2 = new Vector2(50,50).transformAsPoint(this.localToWorld());
    private readonly rectRef: Reference<Rect> = createRef<Rect>()
    public carryInPos: Vector2 = new Vector2(0,0)
    public readonly sumPos: Vector2 =  new Vector2(50,-50).transformAsPoint(this.localToWorld());
    public readonly carryOutPos: Vector2 =  new Vector2(-50,-50).transformAsPoint(this.localToWorld());

    public constructor(props?: FullAdderProps) {
        super({
            ...props,
        })
        this.add(
            <>
            <Rect
                ref={this.rectRef}
                fill={colors.GATE_COLOR}
                width={150}
                height={100}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>(this.inputA() || this.inputB() || this.carryIn()) ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineJoin="round"
            />
                <Txt
                    text={"Full Adder"}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.DEFAULT_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
            </>
        );
        this.carryInPos = new Vector2(this.rectRef().getOriginDelta(Origin.Right).x-sizes.ELEC_WIDTH,20).transformAsPoint(this.localToWorld());
    }
}
