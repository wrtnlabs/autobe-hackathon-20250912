import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information about a specific widget associated with a
 * given UI page.
 *
 * This function fetches data from the 'flex_office_widgets' table for a widget
 * identified by widgetId and belonging to the page identified by pageId.
 *
 * Only authenticated admin users are authorized to access this information.
 *
 * @param props - Object containing authentication and identifiers
 * @param props.admin - Authenticated admin user payload
 * @param props.pageId - UUID of the target page
 * @param props.widgetId - UUID of the target widget
 * @returns Detailed widget information as IFlexOfficeWidget
 * @throws {Error} Throws if the widget does not exist or is soft deleted
 */
export async function getflexOfficeAdminPagesPageIdWidgetsWidgetId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  widgetId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeWidget> {
  const { admin, pageId, widgetId } = props;

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
    configuration: widget.configuration ?? null,
    created_at: toISOStringSafe(widget.created_at),
    updated_at: toISOStringSafe(widget.updated_at),
    deleted_at: widget.deleted_at ? toISOStringSafe(widget.deleted_at) : null,
  };
}
