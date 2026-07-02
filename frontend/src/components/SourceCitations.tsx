import type { Source } from "../store/chatStore";

interface Props {
  sources: Source[];
}

export function SourceCitations({ sources }: Props) {
  if (!sources.length) return null;

  return (
    <div className="mt-3 border-t border-gray-200 pt-2">
      <p className="mb-1 text-xs font-medium text-gray-500">参考来源</p>
      <div className="space-y-1.5">
        {sources.map((s) => (
          <div
            key={s.index}
            id={`source-${s.index}`}
            className="rounded-lg border border-gray-100 bg-white p-2 text-xs"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-[#005BAC]/10 px-1 font-medium text-[#005BAC]">
                [{s.index}]
              </span>
              {s.source_url ? (
                <a
                  href={s.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#005BAC] hover:underline"
                  title={s.category || ""}
                >
                  {s.title}
                </a>
              ) : (
                <span
                  className="font-medium text-gray-700"
                  title={s.category || ""}
                >
                  {s.title}
                </span>
              )}
              <span className="ml-auto text-gray-400">
                相关度: {(s.score * 100).toFixed(1)}%
              </span>
            </div>
            <p className="line-clamp-2 text-gray-500">{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
