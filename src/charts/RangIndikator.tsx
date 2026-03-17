interface Props {
  rang: number | null;
  total: number | null;
}

export default function RangIndikator({ rang, total }: Props) {
  if (rang == null || total == null) return <span className="text-gra-1 text-xs">–</span>;

  const pct = ((total - rang) / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gra-2 rounded-full relative overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gron-1"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-data text-xs text-gra-1">
        {rang}<span className="text-gra-2">/</span>{total}
      </span>
    </div>
  );
}
