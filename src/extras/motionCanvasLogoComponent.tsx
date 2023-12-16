import {
  Node,
  Rect,
  Layout,
  LayoutProps,
  NodeProps,
} from '@motion-canvas/2d/lib/components';
import {all, loop} from '@motion-canvas/core/lib/flow';
import {createRef, range} from '@motion-canvas/core/lib/utils';
import {linear} from '@motion-canvas/core/lib/tweening';

const YELLOW = '#FFC66D';
const RED = '#FF6470';
const GREEN = '#99C47A';
const BLUE = '#68ABDF';

export const Trail = (props: LayoutProps) => (
    <Layout
        layout
        direction={'column'}
        gap={30}
        offsetY={-1}
        {...props}
    />
)

export interface MCLogoProps extends NodeProps {}
  
export class MCLogo extends Node {

    private readonly star = createRef<Node>();
    private readonly trail1 = createRef<Layout>();
    private readonly trail2 = createRef<Layout>();
    private readonly trail3 = createRef<Layout>();
    private readonly dot = createRef<Rect>();
    
    public constructor(props?: MCLogoProps) {
        super({
            ...props,
        })
        this.add(
            <>
                <Node rotation={-45} position={44} scale={0.8} cache>
                    <Node cache y={-270}>
                    <Trail ref={this.trail1}>
                        {range(3).map(_ => (
                        <Rect width={40} radius={20} height={120} fill={YELLOW} />
                        ))}
                    </Trail>
                    <Rect
                        width={40}
                        radius={20}
                        height={270}
                        fill={'white'}
                        offsetY={-1}
                        compositeOperation={'destination-in'}
                    />
                    </Node>
                    <Node cache x={-70} y={-200}>
                    <Trail ref={this.trail2}>
                        {range(3).map(_ => (
                        <Rect width={40} height={120} radius={20} fill={RED} />
                        ))}
                    </Trail>
                    <Rect
                        width={40}
                        radius={20}
                        height={180}
                        fill={'white'}
                        offsetY={-1}
                        compositeOperation={'destination-in'}
                    />
                    </Node>
                    <Node cache x={70} y={-300}>
                    <Trail ref={this.trail3}>
                        {range(4).map(i => (
                        <Rect
                            ref={i === 1 ? this.dot : undefined}
                            width={40}
                            radius={20}
                            height={100}
                            fill={i === 0 ? GREEN : BLUE}
                            offsetY={1}
                        />
                        ))}
                    </Trail>
                    <Rect
                        width={40}
                        radius={20}
                        height={220}
                        fill={'white'}
                        offsetY={-1}
                        y={60}
                        compositeOperation={'destination-in'}
                    />
                    </Node>
                    <Node ref={this.star}>
                    {range(5).map(i => (
                        <Rect
                        width={100}
                        radius={50}
                        height={150}
                        fill={'white'}
                        offsetY={1}
                        rotation={(360 / 5) * i}
                        compositeOperation={'destination-out'}
                        />
                    ))}
                    {range(5).map(i => (
                        <Rect
                        width={40}
                        radius={20}
                        height={120}
                        fill={'white'}
                        offsetY={1}
                        rotation={(360 / 5) * i}
                        />
                    ))}
                    </Node>
                </Node>
            </>
        );
    }

    public *animate() {
        const logo = this
        yield* all(
            logo.star().rotation(360, 4, linear),
            loop(4, function* () {
              yield* logo.trail1().position.y(-150, 1, linear);
              logo.trail1().position.y(0);
            }),
            loop(2, function* () {
              yield* logo.trail2().position.y(-150, 2, linear);
              logo.trail2().position.y(0);
            }),
            loop(2, function* () {
              yield* all(
                logo.trail3().position.y(-130, 2, linear),
                logo.dot().fill(GREEN, 2, linear),
              );
              logo.dot().fill(BLUE);
              logo.trail3().position.y(0);
            }),
          );
        logo.star().rotation(0);
    }
}
