import { readFileSchema, READ_FILE_MAX_BYTES } from "./readFile/schema";
import { writeFileSchema } from "./writeFile/schema";
import { editFileSchema } from "./editFile/schema";
import { listDirectorySchema } from "./listDirectory/schema";
import { grepSchema, GREP_MAX_MATCHES } from "./grep/schema";
import { globSchema, GLOB_MAX_PATHS } from "./glob/schema";
import {
  runShellSchema,
  RUN_SHELL_DEFAULT_TIMEOUT_MS,
  RUN_SHELL_MAX_OUTPUT_BYTES,
} from "./runShell/schema";

export {
  readFileSchema as readFile,
  writeFileSchema as writeFile,
  editFileSchema as editFile,
  listDirectorySchema as listDirectory,
  grepSchema as grep,
  globSchema as glob,
  runShellSchema as runShell,
};

export const tools = {
  readFile: readFileSchema,
  writeFile: writeFileSchema,
  editFile: editFileSchema,
  listDirectory: listDirectorySchema,
  grep: grepSchema,
  glob: globSchema,
  runShell: runShellSchema,
} as const;

export type ToolName = keyof typeof tools;
export type ToolDefinition<N extends ToolName> = (typeof tools)[N];

export {
  READ_FILE_MAX_BYTES,
  GREP_MAX_MATCHES,
  GLOB_MAX_PATHS,
  RUN_SHELL_DEFAULT_TIMEOUT_MS,
  RUN_SHELL_MAX_OUTPUT_BYTES,
};
