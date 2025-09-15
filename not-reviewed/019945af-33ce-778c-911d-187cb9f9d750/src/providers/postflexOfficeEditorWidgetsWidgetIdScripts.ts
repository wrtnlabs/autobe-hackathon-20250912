import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetScript";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new script associated with a widget specified by widgetId.
 *
 * This operation validates that the script belongs to the specified widget,
 * generates a new UUID, sets creation and update timestamps, and inserts the
 * record into the database.
 *
 * @param props - Request properties
 * @param props.editor - The authenticated editor making the request
 * @param props.widgetId - The unique identifier of the target widget
 * @param props.body - The script creation data
 * @returns The newly created widget script with all fields including timestamps
 * @throws {Error} If the widgetId in the body does not match the path parameter
 */
export async function postflexOfficeEditorWidgetsWidgetIdScripts(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidgetScript.ICreate;
}): Promise<IFlexOfficeWidgetScript> {
  const { editor, widgetId, body } = props;

  if (body.flex_office_widget_id !== widgetId) {
    throw new Error("Widget ID in body must match widgetId parameter");
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_widget_scripts.create({
    data: {
      id,
      flex_office_widget_id: body.flex_office_widget_id,
      script_type: body.script_type,
      script_content: body.script_content,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    flex_office_widget_id: created.flex_office_widget_id,
    script_type: created.script_type,
    script_content: created.script_content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
