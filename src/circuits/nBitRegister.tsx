import { NodeProps, Node, Txt, Rect} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Origin, Vector2, originToOffset } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 
import { Reference, createRef } from '@motion-canvas/core/lib/utils';

export interface NBitRegisterProps extends NodeProps {
    // properties
    numBits?: SignalValue<number>
    input?: SignalValue<string>
    load?: SignalValue<boolean>
    reset?: SignalValue<boolean>
  }
  
export class NBitRegister extends Node {
    // implementation
    @initial(8)
    @signal()
    public declare numBits: SimpleSignal<number, this>;
    @initial("")
    @signal()
    public declare input: SimpleSignal<string, this>;
    @initial(false)
    @signal()
    public declare load: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare reset: SimpleSignal<boolean, this>;
    private stored: string = ""
    public output: SimpleSignal<string, this> = createSignal(()=>{
        if (this.load()) {
            let end = this.input().length
            let start = end - this.numBits()
            if (start < 0) start = 0;
            this.stored = this.input().substring(start, end).padStart(this.numBits(), "0")
        }
        if (this.stored == "" || this.reset()) {
            this.stored = "0".repeat(this.numBits())
        }
        return this.stored
    });
    private readonly rectRef: Reference<Rect> = createRef<Rect>()
    private readonly width = 150
    private getIOPos = (n:number, isInput:boolean): Vector2 => {
        let spaces = this.width / (this.numBits()+1)
        let x =  this.width/2 - spaces * (n+1)
        let y = isInput ? 50 : -50
        return new Vector2(x,y).transformAsPoint(this.localToWorld());
    }
    public readonly getInputPos = (n: number): Vector2 => {
        return this.getIOPos(n, true)
    }
    public readonly getOutputPos = (n: number): Vector2 => {
        return this.getIOPos(n, false)
    }


    public constructor(props?: NBitRegisterProps) {
        super({
            ...props,
        })
        this.add(
            <>
            <Rect
                ref={this.rectRef}
                fill={colors.GATE_COLOR}
                width={this.width}
                height={100}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>(this.load() || this.reset()) ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineJoin="round"
            />
                <Txt
                    text={()=>this.numBits() +" Bit Register"}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.DEFAULT_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
            </>
        );
    }
}
