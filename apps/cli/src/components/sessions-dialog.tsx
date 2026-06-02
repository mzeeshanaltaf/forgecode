import { sessionListResponseSchema } from "@lightcode/ai/messages";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { client } from "../lib/client";
import { useDialog } from "./dialog-context";
import { SelectDialog, type SelectDialogOption } from "./select-dialog";

export function SessionsDialog({ onSelectSession }: { onSelectSession: (id: string) => void }) {
  const { close } = useDialog();
  const [options, setOptions] = useState<SelectDialogOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await client.sessions.$get();
      const parsed = sessionListResponseSchema.safeParse(await response.json());
      if (cancelled || !parsed.success) return;
      setOptions(
        parsed.data.sessions.map((session) => ({
          value: session.id,
          label: session.title ?? "Untitled session",
          hint: `- ${formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}`,
        })),
      );
    })()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SelectDialog
      title="Sessions"
      options={options}
      placeholder="Search sessions"
      emptyText={loading ? "Loading sessions…" : "No sessions found"}
      onSelect={(option) => {
        close();
        onSelectSession(option.value);
      }}
      onClose={close}
    />
  );
}
