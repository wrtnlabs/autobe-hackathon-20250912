import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { IPageIFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list widgets on a UI page with pagination and filters.
 *
 * This operation retrieves widgets associated with a specific UI page in
 * FlexOffice, supporting filtering by widget type, name, and deletion status.
 * Pagination parameters allow controlling result set size and page number. The
 * result includes summary information optimized for listing.
 *
 * @param props - Object containing admin payload, page ID, and
 *   filter/pagination parameters
 * @param props.admin - Authenticated admin performing the request
 * @param props.pageId - UUID of the UI page to search widgets in
 * @param props.body - Filter and pagination parameters
 * @returns A paginated list of widget summaries matching the criteria
 * @throws {Error} Throws if any unexpected runtime errors occur
 */
export async function patchflexOfficeAdminPagesPageIdWidgets(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidget.IRequest;
}): Promise<IPageIFlexOfficeWidget.ISummary> {
  const { admin, pageId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    flex_office_page_id: string & tags.Format<"uuid">;
    widget_type?: { contains: string };
    name?: { contains: string };
    deleted_at?: null | { not: null };
  } = {
    flex_office_page_id: pageId,
  };

  if (body.widget_type !== undefined && body.widget_type !== null) {
    where.widget_type = { contains: body.widget_type };
  }

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  if (body.deleted_at !== undefined && body.deleted_at !== null) {
    if (body.deleted_at === true) {
      where.deleted_at = { not: null };
    } else if (body.deleted_at === false) {
      where.deleted_at = null;
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_widgets.findMany({
      where,
      orderBy: body.orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_widgets.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((widget) => ({
      id: widget.id,
      widget_type: widget.widget_type,
      name: widget.name,
      created_at: toISOStringSafe(widget.created_at),
      updated_at: toISOStringSafe(widget.updated_at),
    })),
  };
}
