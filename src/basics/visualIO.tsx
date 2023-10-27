import {Rect, Polygon, NodeProps, Node, Txt, Latex, Layout} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { Vector2 } from '@motion-canvas/core/lib/types';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 

export interface VisualIOProps extends NodeProps {
    // properties
    name: SignalValue<string>
    powered: SignalValue<boolean>
    minWidth?: SignalValue<number>
  }
  
export class VisualIO extends Node {
    // implementation
    @initial("input")
    @signal()
    public declare name: SimpleSignal<string, this>;
    @initial(false)
    @signal()
    public declare powered: SimpleSignal<boolean, this>;
    @initial(0)
    @signal()
    public declare minWidth: SimpleSignal<number, this>;

    public constructor(props?: VisualIOProps) {
        super({
            ...props,
        })
        this.add(
            <>
            {/* Test Rect for sizing purposes */}
            {/* <Rect fill="#ffffff" width={120} height={120}/> */}
                <Rect
                    minHeight={sizes.VISUAL_IO_SIZE}
                    minWidth={this.minWidth || sizes.VISUAL_IO_SIZE}
                    padding={[0,15]}
                    radius={50}
                    stroke={()=>this.powered() ? colors.POWERED_COLOR:colors.VISUAL_IO_OFF_BORDER}
                    fill={()=>this.powered() ? colors.POWERED_COLOR:colors.OFF_COLOR}
                    lineWidth={sizes.WIRE_WIDTH}
                    layout
                    justifyContent={"center"}
                >
                    <Txt
                        text={this.name()}
                        fill={()=>this.powered() ? colors.OFF_COLOR :colors.TEXT_COLOR}
                        fontFamily="Helvetica"
                        fontSize={sizes.VISUAL_IO_TEXT_SIZE}
                        fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                        alignSelf={'center'}
                    />
                </Rect>
            </>
        );
    }
}
