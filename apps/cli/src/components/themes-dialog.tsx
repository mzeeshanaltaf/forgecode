import { useEffect, useRef } from "react";
import { themes, useThemeContext, type ThemeName } from "../lib/theme";
import { useDialog } from "./dialog-context";
import { SelectDialog, type SelectDialogOption } from "./select-dialog";

export function ThemesDialog() {
  const { close } = useDialog();
  const { themeName, setThemeName, previewThemeName } = useThemeContext();

  // The theme that was active when the dialog opened. Highlighting a row previews
  // it live; we only keep that change if the user confirms (Enter / click).
  const originalThemeRef = useRef<ThemeName>(themeName);
  const committedRef = useRef(false);

  // Revert the preview on every cancel path — esc and Ctrl+C are handled by the
  // dialog provider (which bypasses onClose), so revert on unmount instead.
  useEffect(() => {
    return () => {
      if (!committedRef.current) previewThemeName(originalThemeRef.current);
    };
  }, [previewThemeName]);

  const options: SelectDialogOption[] = (Object.keys(themes) as ThemeName[]).map(
    (key) => ({
      value: key,
      label: themes[key].name,
      hint: key === originalThemeRef.current ? "active" : undefined,
    }),
  );

  return (
    <SelectDialog
      title="Themes"
      options={options}
      placeholder="Search themes"
      initialSelectedValue={originalThemeRef.current}
      onHighlight={(option) => previewThemeName(option.value as ThemeName)}
      onSelect={(option) => {
        committedRef.current = true;
        setThemeName(option.value as ThemeName);
        close();
      }}
      onClose={close}
    />
  );
}
