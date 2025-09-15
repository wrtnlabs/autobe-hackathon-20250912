import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a widget permanently from a specific UI page.
 *
 * This operation performs a hard delete on the widget with the given widgetId
 * ensuring the widget belongs to the specified pageId.
 *
 * Only authorized admin users may perform this deletion.
 *
 * @param props - The properties including admin auth, pageId, and widgetId.
 * @param props.admin - Authenticated admin performing the operation.
 * @param props.pageId - UUID of the page to which the widget belongs.
 * @param props.widgetId - UUID of the widget to delete.
 * @throws {Error} When the widget is not found or does not belong to the page.
 */
export async function deleteflexOfficeAdminPagesPageIdWidgetsWidgetId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  widgetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, pageId, widgetId } = props;

  const widget = await MyGlobal.prisma.flex_office_widgets.findUniqueOrThrow({
    where: { id: widgetId },
  });

  if (widget.flex_office_page_id !== pageId) {
    throw new Error("Widget not found on the specified page");
  }

  await MyGlobal.prisma.flex_office_widgets.delete({
    where: { id: widgetId },
  });
}
