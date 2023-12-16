import {Circle, NodeProps, Node, Line, Knot} from '@motion-canvas/2d/lib/components';
import { createRef, range} from '@motion-canvas/core/lib/utils';
import { createSignal, SignalValue, SimpleSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import * as colors from '../globalColors';
import * as sizes from '../globalSizes';
import { PossibleVector2, Vector2 } from '@motion-canvas/core/lib/types';
import { linear } from '@motion-canvas/core/lib/tweening';

export interface WireProps extends NodeProps {
    // properties
    points?: SignalValue<PossibleVector2>[]
    powered?: SignalValue<boolean>
    jointStart?: SignalValue<boolean>
    jointEnd?: SignalValue<boolean>
    isSolid?: SignalValue<boolean>
  }
  
export class Wire extends Node {
    // implementation
    private readonly wireLine = createRef<Line>();

    @initial([[0,0],[0,0]])
    @signal()
    public declare readonly points: SimpleSignal<Vector2[], this>;
    @initial(false)
    @signal()
    public declare powered: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare readonly jointStart: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare readonly jointEnd: SimpleSignal<boolean, this>;
    @initial(false)
    @signal()
    public declare readonly isSolid: SimpleSignal<boolean, this>;
    
    private readonly progress = createSignal(0);
    
    private getLen = function(): number {
        let distance = 0
        let localPoints = this.points()
        for (var i = 1; i < localPoints.length; i++) {
            let p = new Vector2(localPoints[i])
            let last = new Vector2(localPoints[i-1])
            distance += Math.abs(p.x-last.x)+Math.abs(p.y-last.y)
        }
        return distance
    }

    private readonly speed = 0.5
    private readonly spacing = 1 // Electricity spacing in elec ball widths
    private readonly spacingForMath = (this.spacing+1)*sizes.ELEC_WIDTH
    private readonly totalDots = Math.round(this.getLen()/this.spacingForMath)
    private readonly percentage = 1/this.totalDots
    public constructor(props?: WireProps) {
        super({
            ...props,
        })
        this.add(
            <>
                <Line
                    lineCap="round"
                    ref={this.wireLine}
                    lineWidth={sizes.WIRE_WIDTH}
                    stroke={()=>(this.isSolid() && this.powered()) ? colors.POWERED_COLOR : colors.OFF_COLOR}>
                    {this.points().map(b=>
                        <Knot position={b}/>
                    )}
                </Line>
                {!this.isSolid() && range(this.totalDots).map(v=>
                    <Circle
                    opacity={()=>this.powered()?1:0}
                    size={sizes.ELEC_WIDTH}
                    fill={colors.POWERED_COLOR}
                    position={() => this.wireLine().getPointAtPercentage(this.progress()+this.percentage*v).position}/>
                )}

                {this.jointStart() &&
                    <Circle
                    size={sizes.WIRE_JOINT_MIDDLE}
                    lineWidth={sizes.WIRE_JOINT_OUTER}
                    fill={()=>this.powered() ? colors.POWERED_COLOR : colors.OFF_COLOR}
                    stroke={()=>this.powered() ? colors.POWERED_COLOR : colors.OFF_COLOR}
                    position={this.points()[0]}/>
                }
                {this.jointEnd() &&
                    <Circle
                    size={sizes.WIRE_JOINT_MIDDLE}
                    lineWidth={sizes.WIRE_JOINT_OUTER}
                    fill={()=>this.powered() ? colors.POWERED_COLOR : colors.OFF_COLOR}
                    stroke={()=>this.powered() ? colors.POWERED_COLOR : colors.OFF_COLOR}
                    position={this.points()[this.points().length-1]}/>
                }
                
            </>
        );
    }
    public *animate() {
        yield* this.progress(this.percentage, this.speed, linear).to(0,0)
    }
}
