import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing widget of a given page, identified by widgetId.
 *
 * This operation modifies widget properties including name, type, and
 * configuration. Only users with admin or editor roles may update widgets.
 *
 * @param props - Object containing admin payload, pageId, widgetId, and body of
 *   update data
 * @returns The updated widget entity reflecting the latest state
 * @throws {Error} Throws if widget is not found or widget name is duplicated on
 *   the page
 */
export async function putflexOfficeAdminPagesPageIdWidgetsWidgetId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  widgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidget.IUpdate;
}): Promise<IFlexOfficeWidget> {
  const { admin, pageId, widgetId, body } = props;

  // Find the widget by pageId and widgetId ensuring not soft deleted
  const widget = await MyGlobal.prisma.flex_office_widgets.findFirst({
    where: {
      id: widgetId,
      flex_office_page_id: pageId,
      deleted_at: null,
    },
  });

  if (!widget) {
    throw new Error(`Widget not found: id=${widgetId}`);
  }

  // Validate uniqueness of widget name within same page if name is being updated
  if (body.name !== undefined && body.name !== null) {
    const nameConflict = await MyGlobal.prisma.flex_office_widgets.findFirst({
      where: {
        flex_office_page_id: pageId,
        name: body.name,
        deleted_at: null,
        NOT: { id: widgetId },
      },
    });

    if (nameConflict) {
      throw new Error(`Widget name '${body.name}' already exists on this page`);
    }
  }

  // Perform update
  const updated = await MyGlobal.prisma.flex_office_widgets.update({
    where: { id: widgetId },
    data: {
      ...(body.flex_office_page_id !== undefined &&
      body.flex_office_page_id !== null
        ? { flex_office_page_id: body.flex_office_page_id }
        : {}),
      ...(body.widget_type !== undefined && body.widget_type !== null
        ? { widget_type: body.widget_type }
        : {}),
      ...(body.name !== undefined && body.name !== null
        ? { name: body.name }
        : {}),
      configuration:
        body.configuration === undefined ? undefined : body.configuration,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated widget with date fields converted
  return {
    id: updated.id,
    flex_office_page_id: updated.flex_office_page_id,
    widget_type: updated.widget_type,
    name: updated.name,
    configuration: updated.configuration,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
