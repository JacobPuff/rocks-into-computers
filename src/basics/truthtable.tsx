import {Circle, NodeProps, Node, Txt, Spline, Rect, Knot, Layout} from '@motion-canvas/2d/lib/components';
import { SignalValue, SimpleSignal, createSignal } from '@motion-canvas/core/lib/signals';
import {initial, signal} from '@motion-canvas/2d/lib/decorators';
import { createRef, range } from '@motion-canvas/core/lib/utils';
import * as colors from '../globalColors' 
import * as sizes from '../globalSizes' 
import { easeInCubic } from '@motion-canvas/core/lib/tweening';

export interface TruthTableProps extends NodeProps {
    // properties
    columnNames?: SignalValue<string[]> // This could just be inputs[]
    columnData?: SignalValue<any[][]>
  }
  
export class TruthTable extends Node {
    // implementation
    @initial([])
    @signal()
    public declare columnNames: SimpleSignal<string[], this>;
    @initial([])
    @signal()
    public declare columnData: SimpleSignal<any[][], this>;
    public outputRow: SimpleSignal<any[], this> = createSignal(() => this.columnData()[this.currentOutputLine()]);
    public currentOutputLine: SimpleSignal<number, this> = createSignal(0);
    private table = createRef<Layout>();
    private selector = createRef<Rect>();

    private readonly cellHeight = 38
    private makeCell = function(yPos: number, data: any):Node {
        return (
            <Rect
                padding={[0,10]}
                y={yPos}
                height={this.cellHeight}
                fill={colors.TRUTH_TABLE_FILL}
                stroke={colors.OFF_COLOR}
                lineWidth={sizes.TRUTH_TABLE_BORDER_WIDTH}
                layout
                justifyContent={"center"}
            >
                <Txt
                    text={data ?? ""}
                    alignSelf={'center'}
                    fill={colors.TRUTH_TABLE_TEXT}
                    fontFamily="Helvetica"
                    fontSize={30}
                    fontWeight={sizes.DEFAULT_FONT_WEIGHT}
                />
            </Rect>
        )
    }
    private getSelectorY = (i:number) => (i*this.cellHeight-(this.columnData().length*this.cellHeight)/2)+this.cellHeight

    public constructor(props?: TruthTableProps) {
        super({
            ...props,
        })
        this.add(
            <>
                {/* <Rect fill="#ffffff" width={120} height={120}/> */}
                {/* Draw by column */}
                <Layout
                    ref={this.table}
                    direction="row"
                    gap={0}
                    layout
                    spawner={()=>
                        range(this.columnNames().length).flatMap((i) =>
                        <Layout direction="column" gap={0} layout
                            spawner={()=>
                                [this.makeCell(0, this.columnNames()[i]),
                                ...range(this.columnData().length).flatMap((row) =>
                                        this.makeCell(this.cellHeight*(i+1), this.columnData()[row][i])
                                )]
                            }
                        />
                    )}
                />
                
                <Rect
                    ref={this.selector}
                    radius={5}
                    position={()=>[0,this.getSelectorY(this.currentOutputLine())]}
                    width={()=>this.table().width()+5} 
                    height={this.cellHeight+5}
                    stroke={colors.POWERED_COLOR}
                    lineWidth={sizes.TRUTH_TABLE_BORDER_WIDTH}
                />
            </>
        );
    }
    public *select(row: number, duration: number) {
        yield* this.selector().position.y(this.getSelectorY(row), duration, easeInCubic)
        this.currentOutputLine(row)
    }
}
