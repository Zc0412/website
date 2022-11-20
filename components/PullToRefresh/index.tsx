import React, {ReactNode, useEffect, useState, useRef} from 'react';
import {animated, useSpring} from 'react-spring'
import {useDrag} from '@use-gesture/react'
import {getScrollParent} from './get-scroll-parent'
import {rubberbandIfOutOfBounds} from './rubberband'
import {supportsPassive} from './supports-passive'
import styles from './Refresh.module.css'

const classPrefix = `adm-pull-to-refresh`

type PullStatus = 'pulling' | 'canRelease' | 'refreshing' | 'complete'

type PullToRefreshProps = {
    onRefresh?: () => Promise<any>
    pullingText?: ReactNode
    canReleaseText?: ReactNode
    refreshingText?: ReactNode
    completeText?: ReactNode
    completeDelay?: number
    headHeight?: number
    threshold?: number
    disabled?: boolean
    renderText?: (status: PullStatus) => ReactNode
    children?: React.ReactNode
}

const defaultProps = {
    pullingText: '下拉刷新',
    canReleaseText: '释放立即刷新',
    refreshingText: '加载中...',
    completeText: '刷新成功',
    completeDelay: 500,
    disabled: false,
    onRefresh: () => {
    },
}

const sleep = (time: number) =>
    new Promise(resolve => setTimeout(resolve, time))


const PullToRefresh: React.FC<PullToRefreshProps> = (p) => {
    const props = {
        ...defaultProps,
        ...p
    }

    const headHeight = props.headHeight
    const threshold = props.threshold

    const [status, setStatus] = useState<PullStatus>('pulling')

    const [springStyles, api] = useSpring(() => ({
        from: {height: 0},
        config: {
            tension: 300,
            friction: 30,
            clamp: true,
        },
    }))

    const elementRef = useRef<HTMLDivElement>(null)

    const pullingRef = useRef(false)

    //防止下拉时抖动
    useEffect(() => {
        elementRef.current?.addEventListener('touchmove', () => {
        })
    }, [])

    async function doRefresh() {
        api.start({height: headHeight})
        setStatus('refreshing')
        try {
            await props.onRefresh()
            setStatus('complete')
        } catch (e) {
            api.start({
                to: async next => {
                    await next({height: 0})
                    setStatus('pulling')
                },
            })

            throw e
        }
        if (props.completeDelay > 0) {
            await sleep(props.completeDelay)
        }
        api.start({
            to: async next => {
                await next({height: 0})
                setStatus('pulling')
            },
        })
    }

    useDrag(
        state => {
            if (status === 'refreshing' || status === 'complete') return

            const {event} = state

            if (state.last) {
                pullingRef.current = false
                if (status === 'canRelease') {
                    doRefresh()
                } else {
                    api.start({height: 0})
                }
                return
            }

            const [, y] = state.movement
            if (state.first && y > 0) {
                const target = state.event.target
                if (!target || !(target instanceof Element)) return
                let scrollParent = getScrollParent(target)
                while (true) {
                    if (!scrollParent) return
                    const scrollTop = getScrollTop(scrollParent)
                    if (scrollTop > 0) {
                        return
                    }
                    if (scrollParent instanceof Window) {
                        break
                    }
                    scrollParent = getScrollParent(scrollParent.parentNode as Element)
                }
                pullingRef.current = true

                function getScrollTop(element: Window | Element) {
                    return 'scrollTop' in element ? element.scrollTop : element.scrollY
                }
            }

            if (!pullingRef.current) return

            if (event.cancelable) {
                event.preventDefault()
            }
            event.stopPropagation()
            const height = Math.max(
                rubberbandIfOutOfBounds(y, 0, 0, headHeight * 5, 0.5),
                0
            )
            api.start({height})
            setStatus(height > threshold ? 'canRelease' : 'pulling')
        },
        {
            pointer: {touch: true},
            axis: 'y',
            target: elementRef,
            enabled: !props.disabled,
            eventOptions: supportsPassive
                ? {passive: false}
                : (false as unknown as AddEventListenerOptions),
        }
    )

    const renderStatusText = () => {
        if (props.renderText) {
            return props.renderText?.(status)
        }

        if (status === 'pulling') return props.pullingText
        if (status === 'canRelease') return props.canReleaseText
        if (status === 'refreshing') return props.refreshingText
        if (status === 'complete') return props.completeText
    }

    return (
        <animated.div ref={elementRef} className={styles[`${classPrefix}`]}>
            <animated.div style={springStyles} className={styles[`${classPrefix}-head`]}>
                <div
                    className={styles[`${classPrefix}-head-content`]}
                    style={{height: headHeight}}
                >
                    {renderStatusText()}
                </div>
            </animated.div>
            <div className={styles[`${classPrefix}-content`]}>{props.children}</div>
        </animated.div>
    );
};

export default PullToRefresh;