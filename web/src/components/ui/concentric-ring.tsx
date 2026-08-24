import { cn } from "@/lib/utils"

export function ConcentricRing({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-12 items-center justify-center",
        className
      )}
    >
      <div className="absolute size-full animate-[spin_2s_linear_infinite] rounded-full border-2 border-zinc-800 border-t-transparent motion-reduce:animate-none dark:border-zinc-700" />
      <div className="absolute size-2/3 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-2 border-zinc-500 border-b-transparent motion-reduce:animate-none dark:border-zinc-400" />
      <div className="absolute size-1/3 animate-[spin_1s_linear_infinite] rounded-full border-2 border-zinc-300 border-l-transparent motion-reduce:animate-none dark:border-zinc-600" />
    </div>
  )
}
