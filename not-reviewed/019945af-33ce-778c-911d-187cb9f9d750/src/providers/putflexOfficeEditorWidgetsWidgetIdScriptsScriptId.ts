import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetScript";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update a widget script identified by scriptId under a given widgetId.
 *
 * Updates optional fields: script_type, script_content. Checks that the script
 * exists and belongs to given widget. Throws error if not found. Returns the
 * fully updated script record.
 *
 * @param props - Object containing editor authorization, widgetId, scriptId,
 *   and update body
 * @returns The updated widget script data
 * @throws Error if script not found or access denied
 */
export async function putflexOfficeEditorWidgetsWidgetIdScriptsScriptId(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  scriptId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidgetScript.IUpdate;
}): Promise<IFlexOfficeWidgetScript> {
  const { editor, widgetId, scriptId, body } = props;

  // Find existing script with the given widgetId and scriptId
  const script = await MyGlobal.prisma.flex_office_widget_scripts.findFirst({
    where: {
      id: scriptId,
      flex_office_widget_id: widgetId,
      deleted_at: null,
    },
  });

  if (!script) throw new Error("Script not found or access denied");

  // Update script with provided fields and updated_at timestamp
  const updated = await MyGlobal.prisma.flex_office_widget_scripts.update({
    where: { id: scriptId },
    data: {
      script_type: body.script_type ?? undefined,
      script_content: body.script_content ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated record with date strings converted
  return {
    id: updated.id as string & tags.Format<"uuid">,
    flex_office_widget_id: updated.flex_office_widget_id as string &
      tags.Format<"uuid">,
    script_type: updated.script_type,
    script_content: updated.script_content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
