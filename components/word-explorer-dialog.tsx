"use client";

import { useState, useRef, type MouseEvent, type TouchEvent } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    ChevronUp,
    ChevronRight,
    ChevronDown,
    ChevronLeft,
    X,
} from "lucide-react";

type WordDialogProps = {
    open: boolean;
    word: string;
    onOpenChange: (open: boolean) => void;
};

export function WordDialog({ open, word, onOpenChange }: WordDialogProps) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const dragState = useRef<{
        dragging: boolean;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
    }>({
        dragging: false,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
    });

    // --- Mouse drag handlers ---------------------------------------------------
    function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
        e.preventDefault();
        dragState.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            originX: offset.x,
            originY: offset.y,
        };
    }

    function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
        if (!dragState.current.dragging) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        setOffset({
            x: dragState.current.originX + dx,
            y: dragState.current.originY + dy,
        });
    }

    function handleMouseUp() {
        if (!dragState.current.dragging) return;
        dragState.current.dragging = false;
    }

    // --- Touch drag handlers ---------------------------------------------------
    function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
        const t = e.touches[0];
        if (!t) return;
        dragState.current = {
            dragging: true,
            startX: t.clientX,
            startY: t.clientY,
            originX: offset.x,
            originY: offset.y,
        };
    }

    function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
        if (!dragState.current.dragging) return;
        const t = e.touches[0];
        if (!t) return;
        const dx = t.clientX - dragState.current.startX;
        const dy = t.clientY - dragState.current.startY;
        setOffset({
            x: dragState.current.originX + dx,
            y: dragState.current.originY + dy,
        });
    }

    function handleTouchEnd() {
        dragState.current.dragging = false;
    }

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent
                // full-page canvas
                className="
                    max-w-none w-screen h-screen
                    bg-transparent border-none shadow-none p-0
                    flex items-center justify-center
                    overflow-visible
                "
                // prevent outside clicks from closing
                onInteractOutside={(e) => e.preventDefault()}
            >
                {/* Close button in corner */}
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

                {/* Canvas you can drag anywhere */}
                <div
                    className="
                        relative w-full h-full
                        cursor-grab active:cursor-grabbing
                        select-none
                    "
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Centered + panned container */}
                    <div
                        className="absolute top-1/2 left-1/2"
                        style={{
                            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                        }}
                    >
                        <div className="relative w-[320px] h-[320px]">
                            {/* OUTER RING */}
                            <div
                                className="
                                    top-1/2 left-1/2
                                    -translate-x-1/2 -translate-y-1/2
                                    w-64 h-64
                                    rounded-full
                                    border border-zinc-200
                                    bg-zinc-50
                                    shadow-md
                                    relative
                                    overflow-hidden
                                "
                            >
                                {/* DIAGONAL DIVIDERS (visual only) */}
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

                                {/* TOP QUADRANT BUTTON */}
                                <button
                                    type="button"
                                    className="
                                        absolute inset-0
                                        text-zinc-700
                                        hover:bg-zinc-100/80
                                        transition-colors
                                        flex items-center justify-center
                                    "
                                    style={{
                                        clipPath: "polygon(50% 50%, 0 0, 100% 0)",
                                    }}
                                    aria-label="Top action"
                                    onClick={() => {
                                        console.log("Top quadrant clicked");
                                    }}
                                >
                                    <div className="-translate-y-[350%]">
                                        <ChevronUp className="w-7 h-7" />
                                    </div>
                                </button>

                                {/* RIGHT QUADRANT BUTTON */}
                                <button
                                    type="button"
                                    className="
                                        absolute inset-0
                                        text-zinc-700
                                        hover:bg-zinc-100/80
                                        transition-colors
                                        flex items-center justify-center
                                    "
                                    style={{
                                        clipPath: "polygon(50% 50%, 100% 0, 100% 100%)",
                                    }}
                                    aria-label="Right action"
                                    onClick={() => {
                                        console.log("Right quadrant clicked");
                                    }}
                                >
                                    <div className="translate-x-[350%]">
                                        <ChevronRight className="w-7 h-7" />
                                    </div>
                                </button>

                                {/* BOTTOM QUADRANT BUTTON */}
                                <button
                                    type="button"
                                    className="
                                        absolute inset-0
                                        text-zinc-700
                                        hover:bg-zinc-100/80
                                        transition-colors
                                        flex items-center justify-center
                                    "
                                    style={{
                                        clipPath: "polygon(50% 50%, 0 100%, 100% 100%)",
                                    }}
                                    aria-label="Bottom action"
                                    onClick={() => {
                                        console.log("Bottom quadrant clicked");
                                    }}
                                >
                                    <div className="translate-y-[350%]">
                                        <ChevronDown className="w-7 h-7" />
                                    </div>
                                </button>

                                {/* LEFT QUADRANT BUTTON */}
                                <button
                                    type="button"
                                    className="
                                        absolute inset-0
                                        text-zinc-700
                                        hover:bg-zinc-100/80
                                        transition-colors
                                        flex items-center justify-center
                                    "
                                    style={{
                                        clipPath: "polygon(50% 50%, 0 0, 0 100%)",
                                    }}
                                    aria-label="Left action"
                                    onClick={() => {
                                        console.log("Left quadrant clicked");
                                    }}
                                >
                                    <div className="-translate-x-[350%]">
                                        <ChevronLeft className="w-7 h-7" />
                                    </div>
                                </button>
                            </div>

                            {/* CENTER WORD CIRCLE */}
                            <div
                                className="
                                    absolute top-1/2 left-1/2
                                    -translate-x-1/2 -translate-y-1/2
                                    w-36 h-36
                                    rounded-full
                                    bg-white
                                    shadow-lg
                                    border border-zinc-200
                                    flex items-center justify-center
                                    text-xl font-semibold
                                    text-zinc-900
                                    z-10
                                "
                            >
                                <span className="px-4 text-center break-words">{word}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
