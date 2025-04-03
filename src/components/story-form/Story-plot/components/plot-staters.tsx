import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

const storyStarters = [
  "A magical trip to the moon",
  "The day the toys came alive",
  "Learning colors with animals",
  "Finding a hidden treasure in the backyard",
  "A day at a magical playground",
  "An adventure with a friendly dragon",
];

interface StoryStarterProps {
  onSelect: (starter: string, index: number) => void;
  selectedIndex: number | null;
}

export const StoryStarter = ({
  onSelect,
  selectedIndex,
}: StoryStarterProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 200;
    const container = scrollContainerRef.current;
    const newScrollPosition =
      container.scrollLeft +
      (direction === "left" ? -scrollAmount : scrollAmount);

    container.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">Pick a Story Starter</h2>
      <div className="relative group">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm group-hover:opacity-100 transition-opacity disabled:opacity-0"
          aria-label="Previous stories"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-4 px-2 pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {storyStarters.map((starter, index) => (
            <button
              type="button"
              key={index}
              onClick={() => onSelect(starter, index)}
              className={`flex-none w-full sm:w-[200px] p-6 rounded-2xl text-center transition-all snap-start ${
                index === selectedIndex
                  ? "bg-[#9B87F5] text-white hover:bg-[#8B5CF6]"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {starter}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm group-hover:opacity-100 transition-opacity disabled:opacity-0"
          aria-label="Next stories"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <style jsx global>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
};
