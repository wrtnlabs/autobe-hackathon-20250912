import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";
import { IPageIFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetInstallation";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Lists paginated widget installations for a specific marketplace widget.
 *
 * This operation allows an authenticated editor to retrieve a filtered,
 * paginated list of UI page widget installations associated with the specified
 * marketplace widget ID.
 *
 * It supports optional filtering by page ID, search text filtered on page ID or
 * configuration data, and sorting parameters.
 *
 * @param props - The function parameters including authenticated editor, widget
 *   ID, and filter/pagination body
 * @returns Paginated summary of widget installations matching criteria
 * @throws Error if any database error occurs
 */
export async function patchflexOfficeEditorMarketplaceWidgetsWidgetIdInstallations(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidgetInstallation.IRequest;
}): Promise<IPageIFlexOfficeWidgetInstallation.ISummary> {
  const page = props.body.page ?? 0;
  const limit = props.body.limit ?? 10;

  const whereConditions = {
    deleted_at: null,
    marketplace_widget_id: props.widgetId,
    ...(props.body.filterByPageId !== undefined &&
      props.body.filterByPageId !== null && {
        page_id: props.body.filterByPageId,
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        OR: [
          { page_id: { contains: props.body.search } },
          { configuration_data: { contains: props.body.search } },
        ],
      }),
  };

  const orderBy = props.body.sortBy
    ? { [props.body.sortBy]: props.body.sortOrder === "asc" ? "asc" : "desc" }
    : { installation_date: "desc" };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.flex_office_widget_installations.findMany({
      where: whereConditions,
      orderBy,
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        marketplace_widget_id: true,
        page_id: true,
        installation_date: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_widget_installations.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((e) => ({
      id: e.id,
      marketplace_widget_id: e.marketplace_widget_id,
      page_id: e.page_id,
      installation_date: toISOStringSafe(e.installation_date),
      created_at: toISOStringSafe(e.created_at),
    })),
  };
}
