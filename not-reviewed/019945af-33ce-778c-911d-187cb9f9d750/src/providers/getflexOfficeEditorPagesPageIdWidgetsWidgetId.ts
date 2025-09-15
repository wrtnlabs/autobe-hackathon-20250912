import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve detailed information about a specific widget identified by widgetId
 * and pageId for an authenticated editor user.
 *
 * Ensures widget exists and is not soft deleted. Returns full widget entity
 * data with all timestamps converted to string & tags.Format<'date-time'>.
 *
 * @param props - Parameter object
 * @param props.editor - Authenticated editor payload
 * @param props.pageId - UUID of the page
 * @param props.widgetId - UUID of the widget
 * @returns IFlexOfficeWidget - Detailed widget information
 * @throws Error if widget not found or soft deleted
 */
export async function getflexOfficeEditorPagesPageIdWidgetsWidgetId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  widgetId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeWidget> {
  const { editor, pageId, widgetId } = props;

  const widget = await MyGlobal.prisma.flex_office_widgets.findFirstOrThrow({
    where: {
      id: widgetId,
      flex_office_page_id: pageId,
      deleted_at: null,
    },
  });

  return {
    id: widget.id,
    flex_office_page_id: widget.flex_office_page_id,
    widget_type: widget.widget_type,
    name: widget.name,
    configuration: widget.configuration ?? undefined,
    created_at: toISOStringSafe(widget.created_at),
    updated_at: toISOStringSafe(widget.updated_at),
    deleted_at: widget.deleted_at ? toISOStringSafe(widget.deleted_at) : null,
  };
}
