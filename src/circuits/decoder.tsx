import {Circle, NodeProps, Node, Txt, Rect} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Origin, Vector2, originToOffset } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 
import { Reference, createRef } from '@motion-canvas/core/lib/utils';

export interface DecoderProps extends NodeProps {
    // properties
    numBitsOut?: SignalValue<number>
    input?: SignalValue<string>
  }
  
export class Decoder extends Node {
    // implementation
    @initial(8)
    @signal()
    public declare numBitsOut: SimpleSignal<number, this>;
    @initial("")
    @signal()
    public declare input: SimpleSignal<string, this>;
    private readonly rectRef: Reference<Rect> = createRef<Rect>()
    public carryInPos: Vector2 = new Vector2(0,0)
    public readonly sumPos: Vector2 =  new Vector2(50,-50).transformAsPoint(this.localToWorld());
    public readonly carryOutPos: Vector2 =  new Vector2(-50,-50).transformAsPoint(this.localToWorld());
    public output: SimpleSignal<string, this> = createSignal(()=>{
        const num = parseInt(this.input(), 2)
        if (num == 0) return "0".repeat(this.numBitsOut())
        const initial = 1
        let out = initial << (this.numBitsOut()-1)
        return  (out >> (num-1)).toString(2).padStart(this.numBitsOut(), "0")
    });
    private readonly size = 150
    private getIOPos = (n:number, numBits:number, side:number): Vector2 => {
        let spaces = this.size / (numBits+1)
        let outAxis =  this.size/2 - spaces * (n+1)
        let otherAxis = this.size/2
        let x, y = 0
        switch (side){
            case 0:
                x = outAxis
                y = otherAxis*-1
                break
            case 1:
                x = outAxis
                y = otherAxis
                break
            case 2:
                x = otherAxis*-1
                y = outAxis
                break
            case 3:
                x = otherAxis
                y = outAxis
                break
            default:
                break
        }
        return new Vector2(x,y).transformAsPoint(this.localToWorld());
    }
    
    public readonly getTopIOPos = (n: number, numBits:number=this.numBitsOut()): Vector2 => {
        return this.getIOPos(n,numBits, 0)
    }
    public readonly getBottomIOPos = (n: number, numBits:number=this.numBitsOut()): Vector2 => {
        return this.getIOPos(n,numBits, 1)
    }
    public readonly getLeftIOPos = (n: number, numBits:number=this.numBitsOut()): Vector2 => {
        return this.getIOPos(n,numBits, 2)
    }
    public readonly getRightIOPos = (n: number, numBits:number=this.numBitsOut()): Vector2 => {
        return this.getIOPos(n,numBits, 3)
    }

    public constructor(props?: DecoderProps) {
        super({
            ...props,
        })
        this.add(
            <>
            <Rect
                ref={this.rectRef}
                fill={colors.GATE_COLOR}
                width={this.size}
                height={this.size}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>parseInt(this.input(),2) ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineJoin="round"
            />
                <Txt
                    text={"Decoder"}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.DEFAULT_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
            </>
        );
    }
}
