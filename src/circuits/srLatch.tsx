import {Circle, NodeProps, Node, Txt, Rect} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Origin, Vector2, originToOffset } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 
import { Reference, createRef } from '@motion-canvas/core/lib/utils';

export interface SRLatchProps extends NodeProps {
    // properties
    set?: SignalValue<boolean>
    reset?: SignalValue<boolean>
    resetDominated?: SignalValue<boolean>
  }
  
export class SRLatch extends Node {
    // implementation
    @initial(false)
    @signal()
    public declare set: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare reset: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare resetDominated: SimpleSignal<boolean, this>;

    private stored = false;
    public output: SimpleSignal<boolean, this> = createSignal(() => {
        if (this.set() && this.reset()){
            this.stored = this.resetDominated() ? false : true
        } else if (this.set()) {
            this.stored = true
        } else if (this.reset()) {
            this.stored = false
        }
        return this.stored
    });
    public notOutput: SimpleSignal<boolean, this> = createSignal(() => !this.output());

    private readonly localResetPos: Vector2 = new Vector2(-50,50)
    private readonly localSetPos: Vector2 = new Vector2(50,50)
    private readonly localOutputPos: Vector2 = new Vector2(-50,-50)
    private readonly localNotOutputPos: Vector2 = new Vector2(50,-50)
    public resetPos: SimpleSignal<Vector2,this> = createSignal(() =>this.localResetPos.transformAsPoint(this.localToParent()));
    public setPos: SimpleSignal<Vector2,this> = createSignal(() =>this.localSetPos.transformAsPoint(this.localToParent()));
    public outputPos: SimpleSignal<Vector2,this> = createSignal(() =>this.localOutputPos.transformAsPoint(this.localToParent()));
    public notOutputPos: SimpleSignal<Vector2,this> = createSignal(() =>this.localNotOutputPos.transformAsPoint(this.localToParent()));
    
    public constructor(props?: SRLatchProps) {
        super({
            ...props,
        })
        this.add(
            <>
            <Rect
                fill={colors.GATE_COLOR}
                width={150}
                height={100}
                lineWidth={sizes.WIRE_WIDTH}
                stroke={()=>(this.set() || this.reset()) ? colors.POWERED_COLOR:colors.OFF_COLOR}
                lineJoin="round"
            />
                <Txt
                    text={"SR Latch"}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.DEFAULT_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
                <Txt
                    text={"R"}
                    position={[this.localResetPos.x, this.localResetPos.y - 10]}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.INPUT_MARKER_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
                <Txt
                    text={"S"}
                    position={[this.localSetPos.x, this.localSetPos.y - 10]}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.INPUT_MARKER_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
                <Txt
                    text={"Q"}
                    position={[this.localOutputPos.x, this.localOutputPos.y + 17]}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.INPUT_MARKER_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
                <Txt
                    text={"Q̅"}
                    position={[this.localNotOutputPos.x, this.localNotOutputPos.y + 17]}
                    fill={colors.TEXT_COLOR}
                    fontFamily="Helvetica"
                    fontSize={sizes.INPUT_MARKER_FONT_SIZE}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
            </>
        );
    }
}
