import { MODELS, PROVIDER_LABELS } from "@lightcode/ai/registry";
import { useModelContext } from "../lib/model-context";
import { useDialog } from "./dialog-context";
import { SelectDialog, type SelectDialogOption } from "./select-dialog";

export function ModelsDialog() {
  const { close } = useDialog();
  const { modelId, setModelId } = useModelContext();

  const options: SelectDialogOption[] = MODELS.map((m) => {
    const provider = PROVIDER_LABELS[m.provider];
    return {
      value: m.id,
      label: m.label,
      hint: m.id === modelId ? `${provider} · active` : provider,
    };
  });

  return (
    <SelectDialog
      title="Models"
      options={options}
      placeholder="Search models"
      initialSelectedValue={modelId}
      onSelect={(option) => {
        setModelId(option.value);
        close();
      }}
      onClose={close}
    />
  );
}
