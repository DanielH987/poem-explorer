"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    ChevronUp,
    ChevronRight,
    ChevronDown,
    ChevronLeft,
    X,
    Volume2,
} from "lucide-react";

type WordDialogProps = {
    open: boolean;
    word: string;
    audioSrc?: string;
    onOpenChange: (open: boolean) => void;
};

type PanelState = {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
};

export function WordDialog({ open, word, audioSrc, onOpenChange }: WordDialogProps) {
    const [panels, setPanels] = useState<PanelState>({
        top: false,
        right: false,
        bottom: false,
        left: false,
    });

    const togglePanel = (side: keyof PanelState) => {
        setPanels((prev) => {
            const isOpen = prev[side];

            // Close all if clicking the open one
            if (isOpen) {
                return { top: false, right: false, bottom: false, left: false };
            }

            // Otherwise open only the clicked one
            return {
                top: false,
                right: false,
                bottom: false,
                left: false,
                [side]: true,
            };
        });
    };

    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const groupRef = useRef<HTMLDivElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const panelRefs = {
        top: useRef<HTMLDivElement | null>(null),
        right: useRef<HTMLDivElement | null>(null),
        bottom: useRef<HTMLDivElement | null>(null),
        left: useRef<HTMLDivElement | null>(null),
    };

    useEffect(() => {
        const activeSide = (Object.keys(panels) as (keyof PanelState)[])
            .find((side) => panels[side]);

        if (!activeSide) {
            setOffset({ x: 0, y: 0 });
            return;
        }

        const panelEl = panelRefs[activeSide].current;
        if (!panelEl) return;

        const panelRect = panelEl.getBoundingClientRect();
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;

        const panelCenterX = panelRect.left + panelRect.width / 2;
        const panelCenterY = panelRect.top + panelRect.height / 2;

        const dx = viewportCenterX - panelCenterX;
        const dy = viewportCenterY - panelCenterY;

        setOffset((prev) => ({
            x: prev.x + dx,
            y: prev.y + dy,
        }));
    }, [panels]);

    useEffect(() => {
        if (!open) {
            setPanels({ top: false, right: false, bottom: false, left: false });
            setOffset({ x: 0, y: 0 });
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="
                    max-w-none w-screen h-screen
                    bg-transparent border-none shadow-none p-0
                    flex items-center justify-center
                    overflow-visible
                    "
            >
                {/* Close button */}
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="
                        absolute top-4 right-4 z-30
                        inline-flex items-center justify-center
                        w-8 h-8 rounded-full
                        bg-white shadow border border-zinc-200
                        text-zinc-700 hover:bg-zinc-100
                        transition-colors
                    "
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Centered main radial dialog */}
                <div
                    ref={groupRef}
                    className="relative w-[400px] h-[400px] transition-transform duration-300"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                    }}
                >
                    {/* OUTER RING */}
                    <div
                        className="
                            absolute top-1/2 left-1/2
                            -translate-x-1/2 -translate-y-1/2
                            w-80 h-80
                            rounded-full
                            border border-zinc-200
                            bg-zinc-50
                            shadow-md
                            overflow-hidden
                            relative
                        "
                    >
                        {/* DIAGONAL DIVIDERS */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div
                                className="
                                absolute top-1/2 left-1/2
                                -translate-x-1/2 -translate-y-1/2
                                w-[100%] h-px
                                bg-zinc-200
                                rotate-45
                                "
                            />
                            <div
                                className="
                                absolute top-1/2 left-1/2
                                -translate-x-1/2 -translate-y-1/2
                                w-[100%] h-px
                                bg-zinc-200
                                -rotate-45
                                "
                            />
                        </div>

                        {/* TOP QUADRANT */}
                        <button
                            type="button"
                            className={`
                                absolute inset-0
                                flex items-center justify-center
                                text-sky-600
                                hover:bg-sky-50/80
                                ${panels.top ? "bg-sky-50/80" : ""}
                                transition-colors
                            `}
                            style={{ clipPath: "polygon(50% 50%, 0 0, 100% 0)" }}
                            onClick={() => togglePanel("top")}
                            aria-label="Top panel"
                        >
                            <div className="-translate-y-[460%]">
                                <ChevronUp
                                    className={`
                                w-7 h-7
                                transition-transform duration-300
                                ${panels.top ? "rotate-180" : ""}
                            `}
                                />
                            </div>
                        </button>

                        {/* RIGHT QUADRANT */}
                        <button
                            type="button"
                            className={`
                                absolute inset-0
                                flex items-center justify-center
                                text-emerald-600
                                hover:bg-emerald-50/80
                                ${panels.right ? "bg-emerald-50/80" : ""}
                                transition-colors
                            `}
                            style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 100%)" }}
                            onClick={() => togglePanel("right")}
                            aria-label="Right panel"
                        >
                            <div className="translate-x-[460%]">
                                <ChevronRight
                                    className={`
                                w-7 h-7
                                transition-transform duration-300
                                ${panels.right ? "rotate-180" : ""}
                            `}
                                />
                            </div>
                        </button>

                        {/* BOTTOM QUADRANT */}
                        <button
                            type="button"
                            className={`"
                                absolute inset-0
                                flex items-center justify-center
                                text-amber-600
                                hover:bg-amber-50/80
                                ${panels.bottom ? "bg-amber-50/80" : ""}
                                transition-colors
                            `}
                            style={{ clipPath: "polygon(50% 50%, 0 100%, 100% 100%)" }}
                            onClick={() => togglePanel("bottom")}
                            aria-label="Bottom panel"
                        >
                            <div className="translate-y-[460%]">
                                <ChevronDown
                                    className={`
                                w-7 h-7
                                transition-transform duration-300
                                ${panels.bottom ? "rotate-180" : ""}
                            `}
                                />
                            </div>
                        </button>

                        {/* LEFT QUADRANT */}
                        <button
                            type="button"
                            className={`
                                absolute inset-0
                                flex items-center justify-center
                                text-rose-600
                                hover:bg-rose-50/80
                                ${panels.left ? "bg-rose-50/80" : ""}
                                transition-colors
                            `}
                            style={{ clipPath: "polygon(50% 50%, 0 0, 0 100%)" }}
                            onClick={() => togglePanel("left")}
                            aria-label="Left panel"
                        >
                            <div className="-translate-x-[460%]">
                                <ChevronLeft
                                    className={`
                                w-7 h-7
                                transition-transform duration-300
                                ${panels.left ? "rotate-180" : ""}
                            `}
                                />
                            </div>
                        </button>
                    </div>

                    {/* CENTER WORD CIRCLE */}
                    <div
                        className="
                            absolute top-1/2 left-1/2
                            -translate-x-1/2 -translate-y-1/2
                            w-52 h-52
                            rounded-full
                            bg-white
                            shadow-lg
                            border border-zinc-200
                            flex items-center justify-center
                            text-xl font-semibold text-zinc-900
                            z-10
                        "
                    >
                        <span className="px-4 text-center break-words">{word}</span>

                        {audioSrc && (
                            <>
                            <audio ref={audioRef} src={audioSrc} className="hidden" />
                            <button
                                type="button"
                                onClick={() => audioRef.current?.play()}
                                className="
                                inline-flex items-center justify-center
                                w-8 h-8 rounded-full
                                border border-zinc-200
                                bg-zinc-50
                                hover:bg-zinc-100
                                transition-colors
                                "
                                aria-label="Play pronunciation"
                            >
                                <Volume2 className="w-4 h-4" />
                            </button>
                            </>
                        )}
                    </div>

                    {/* TOP PANEL */}
                    {panels.top && (
                        <div
                            ref={panelRefs.top}
                            className="
                        absolute left-1/2
                        -translate-x-1/2
                        -top-3
                        -translate-y-full
                        w-64
                        rounded-2xl
                        bg-sky-50
                        shadow-lg
                        border border-sky-200
                        p-3
                        z-20
                        "
                        >
                            <div className="text-xs font-semibold uppercase tracking-wide text-sky-500 mb-1">
                                Top panel
                            </div>
                            <div className="text-sm text-sky-900">
                                Content for <strong>{word}</strong> (e.g., definition).
                            </div>
                        </div>
                    )}

                    {/* RIGHT PANEL */}
                    {panels.right && (
                        <div
                            ref={panelRefs.right}
                            className="
                        absolute top-1/2
                        -translate-y-1/2
                        -right-3
                        translate-x-full
                        w-64
                        rounded-2xl
                        bg-emerald-50
                        shadow-lg
                        border border-emerald-200
                        p-3
                        z-20
                        "
                        >
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500 mb-1">
                                Right panel
                            </div>
                            <div className="text-sm text-emerald-900">
                                Content for <strong>{word}</strong> (e.g., grammar).
                            </div>
                        </div>
                    )}

                    {/* BOTTOM PANEL */}
                    {panels.bottom && (
                        <div
                            ref={panelRefs.bottom}
                            className="
                        absolute left-1/2
                        -translate-x-1/2
                        -bottom-3
                        translate-y-full
                        w-64
                        rounded-2xl
                        bg-amber-50
                        shadow-lg
                        border border-amber-200
                        p-3
                        z-20
                        "
                        >
                            <div className="text-xs font-semibold uppercase tracking-wide text-amber-500 mb-1">
                                Bottom panel
                            </div>
                            <div className="text-sm text-amber-900">
                                Content for <strong>{word}</strong> (e.g., examples).
                            </div>
                        </div>
                    )}

                    {/* LEFT PANEL */}
                    {panels.left && (
                        <div
                            ref={panelRefs.left}
                            className="
                        absolute top-1/2
                        -translate-y-1/2
                        -left-3
                        -translate-x-full
                        w-64
                        rounded-2xl
                        bg-rose-50
                        shadow-lg
                        border border-rose-200
                        p-3
                        z-20
                        "
                        >
                            <div className="text-xs font-semibold uppercase tracking-wide text-rose-500 mb-1">
                                Left panel
                            </div>
                            <div className="text-sm text-rose-900">
                                Content for <strong>{word}</strong> (e.g., translations).
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
