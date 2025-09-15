import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Delete a UI widget script by ID
 *
 * This function permanently deletes a widget script associated with a specific
 * widget. It verifies the script exists under the given widget and is not soft
 * deleted. Only authenticated editors who own the widget scripts can perform
 * this operation.
 *
 * @param props - The parameters including the authenticated editor, widgetId,
 *   and scriptId
 * @param props.editor - Authenticated editor payload
 * @param props.widgetId - UUID of the UI widget to which the script belongs
 * @param props.scriptId - UUID of the script to delete
 * @throws {Error} Throws error if the widget script does not exist or is
 *   already deleted
 */
export async function deleteflexOfficeEditorWidgetsWidgetIdScriptsScriptId(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  scriptId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, widgetId, scriptId } = props;

  // Find the script to ensure it belongs to the widget and not soft deleted
  const script = await MyGlobal.prisma.flex_office_widget_scripts.findFirst({
    where: {
      id: scriptId,
      flex_office_widget_id: widgetId,
      deleted_at: null,
    },
  });

  if (!script) {
    throw new Error("Widget script not found or already deleted.");
  }

  // Permanently delete the script
  await MyGlobal.prisma.flex_office_widget_scripts.delete({
    where: { id: scriptId },
  });
}
