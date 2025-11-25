"use client";

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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="
                max-w-none w-screen h-screen
                bg-transparent border-none shadow-none p-0
                flex items-center justify-center
                overflow-visible
                "
                onInteractOutside={(e) => e.preventDefault()}
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

                {/* Centered dialog */}
                <div className="relative w-[320px] h-[320px]">
                    {/* OUTER RING */}
                    <div
                        className="
                            absolute top-1/2 left-1/2
                            -translate-x-1/2 -translate-y-1/2
                            w-64 h-64
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
                            className="
                                absolute inset-0
                                flex items-center justify-center
                                text-zinc-700
                                hover:bg-zinc-100/80
                                transition-colors
                            "
                            style={{
                                clipPath: "polygon(50% 50%, 0 0, 100% 0)",
                            }}
                        >
                            <div className="-translate-y-[350%]">
                                <ChevronUp className="w-7 h-7" />
                            </div>
                        </button>

                        {/* RIGHT QUADRANT */}
                        <button
                            type="button"
                            className="
                                absolute inset-0
                                flex items-center justify-center
                                text-zinc-700
                                hover:bg-zinc-100/80
                                transition-colors
                            "
                            style={{
                                clipPath: "polygon(50% 50%, 100% 0, 100% 100%)",
                            }}
                        >
                            <div className="translate-x-[350%]">
                                <ChevronRight className="w-7 h-7" />
                            </div>
                        </button>

                        {/* BOTTOM QUADRANT */}
                        <button
                            type="button"
                            className="
                                absolute inset-0
                                flex items-center justify-center
                                text-zinc-700
                                hover:bg-zinc-100/80
                                transition-colors
                            "
                            style={{
                                clipPath: "polygon(50% 50%, 0 100%, 100% 100%)",
                            }}
                        >
                            <div className="translate-y-[350%]">
                                <ChevronDown className="w-7 h-7" />
                            </div>
                        </button>

                        {/* LEFT QUADRANT */}
                        <button
                            type="button"
                            className="
                                absolute inset-0
                                flex items-center justify-center
                                text-zinc-700
                                hover:bg-zinc-100/80
                                transition-colors
                            "
                            style={{
                                clipPath: "polygon(50% 50%, 0 0, 0 100%)",
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
                            text-xl font-semibold text-zinc-900
                            z-10
                            "
                    >
                        <span className="px-4 text-center break-words">{word}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
