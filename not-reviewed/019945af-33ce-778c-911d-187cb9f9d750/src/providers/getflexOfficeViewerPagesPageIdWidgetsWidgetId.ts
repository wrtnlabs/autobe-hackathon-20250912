import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Retrieves detailed information about a specific widget by widgetId and
 * pageId.
 *
 * This function fetches a widget belonging to a given UI page from the
 * database. It guarantees the widget exists, is not soft deleted, and belongs
 * to the specified page.
 *
 * Date fields are converted to ISO 8601 strings as per API specification.
 *
 * @param props - An object containing the viewer payload and the identifiers
 *   for the page and widget.
 * @param props.viewer - Authenticated viewer payload providing access context.
 * @param props.pageId - UUID of the UI page to which the widget belongs.
 * @param props.widgetId - UUID of the widget to retrieve.
 * @returns The detailed widget record conforming to IFlexOfficeWidget.
 * @throws {Error} Throws if widget with specified pageId and widgetId does not
 *   exist or access is unauthorized.
 */
export async function getflexOfficeViewerPagesPageIdWidgetsWidgetId(props: {
  viewer: ViewerPayload;
  pageId: string & tags.Format<"uuid">;
  widgetId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeWidget> {
  const { viewer, pageId, widgetId } = props;

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
