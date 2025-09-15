import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Deletes a widget permanently from a specific UI page.
 *
 * This operation removes the widget record without performing soft delete. Only
 * users with the 'editor' role can invoke this function.
 *
 * @param props - Object containing the editor payload, pageId and widgetId.
 * @param props.editor - Authenticated editor payload.
 * @param props.pageId - UUID of the UI page containing the widget.
 * @param props.widgetId - UUID of the widget to delete.
 * @returns Void
 * @throws {Error} Throws if the widget does not exist for the given page.
 */
export async function deleteflexOfficeEditorPagesPageIdWidgetsWidgetId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  widgetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, pageId, widgetId } = props;

  // Authorization is assumed to be enforced by external middleware or decorator

  // Find the widget by ID and page ID, ensuring it's not soft deleted
  const widget = await MyGlobal.prisma.flex_office_widgets.findFirst({
    where: {
      id: widgetId,
      flex_office_page_id: pageId,
      deleted_at: null,
    },
  });

  if (!widget) {
    throw new Error("Widget not found");
  }

  // Perform hard delete of the widget
  await MyGlobal.prisma.flex_office_widgets.delete({ where: { id: widgetId } });
}
