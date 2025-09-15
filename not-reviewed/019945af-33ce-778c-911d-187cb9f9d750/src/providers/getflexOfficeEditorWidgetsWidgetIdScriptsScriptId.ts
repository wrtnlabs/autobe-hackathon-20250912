import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetScript";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Get widget script details by widgetId and scriptId
 *
 * Retrieves detailed information for a widget script identified by scriptId
 * belonging to the widget identified by widgetId. Requires the caller to be an
 * authenticated editor.
 *
 * @param props - Object containing the editor payload, widgetId and scriptId
 * @param props.editor - Authenticated editor's payload
 * @param props.widgetId - UUID of the widget the script belongs to
 * @param props.scriptId - UUID of the widget script to retrieve
 * @returns Full widget script information conforming to IFlexOfficeWidgetScript
 * @throws {Error} Throws if the script is not found or the widgetId/scriptId
 *   pair does not match
 */
export async function getflexOfficeEditorWidgetsWidgetIdScriptsScriptId(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  scriptId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeWidgetScript> {
  const { widgetId, scriptId } = props;

  const script =
    await MyGlobal.prisma.flex_office_widget_scripts.findFirstOrThrow({
      where: {
        id: scriptId,
        flex_office_widget_id: widgetId,
      },
    });

  return {
    id: script.id,
    flex_office_widget_id: script.flex_office_widget_id,
    script_type: script.script_type,
    script_content: script.script_content,
    created_at: toISOStringSafe(script.created_at),
    updated_at: toISOStringSafe(script.updated_at),
  };
}
