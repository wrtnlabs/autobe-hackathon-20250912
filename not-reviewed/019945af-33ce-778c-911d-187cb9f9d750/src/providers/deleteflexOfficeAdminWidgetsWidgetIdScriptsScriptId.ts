import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a UI widget script associated with a specific widget.
 *
 * This operation permanently deletes a record from the
 * flex_office_widget_scripts table. Only authorized admin users can perform
 * this operation.
 *
 * @param props - Object containing admin information and identifiers for the
 *   widget and script to delete.
 * @param props.admin - Authenticated admin user performing the deletion.
 * @param props.widgetId - UUID of the UI widget the script belongs to.
 * @param props.scriptId - UUID of the widget script to be deleted.
 * @returns Void
 * @throws {Error} Throws if the widget script does not exist.
 * @throws {Error} Throws if the widget script does not belong to the specified
 *   widget.
 */
export async function deleteflexOfficeAdminWidgetsWidgetIdScriptsScriptId(props: {
  admin: AdminPayload;
  widgetId: string & tags.Format<"uuid">;
  scriptId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, widgetId, scriptId } = props;

  const script = await MyGlobal.prisma.flex_office_widget_scripts.findUnique({
    where: { id: scriptId },
  });

  if (!script) {
    throw new Error("Widget script not found");
  }

  if (script.flex_office_widget_id !== widgetId) {
    throw new Error("Widget script does not belong to the specified widget");
  }

  await MyGlobal.prisma.flex_office_widget_scripts.delete({
    where: { id: scriptId },
  });
}
