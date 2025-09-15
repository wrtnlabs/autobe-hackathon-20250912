import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetKpi";
import { IPageIFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetKpi";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieves a paginated list of KPI widget summaries for the editor.
 *
 * Supports filtering by search keyword in id, flex_office_widget_id or
 * config_json, along with sorting and pagination parameters.
 *
 * @param props - Object containing editor payload and request parameters.
 * @param props.editor - Authenticated editor's payload.
 * @param props.body - Search, filter, and pagination criteria for KPI widgets.
 * @returns Paginated list of KPI widget summaries with pagination info.
 * @throws {Error} Throws if underlying database operation fails.
 */
export async function patchflexOfficeEditorWidgetsKpi(props: {
  editor: EditorPayload;
  body: IFlexOfficeWidgetKpi.IRequest;
}): Promise<IPageIFlexOfficeWidgetKpi.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { id: body.search },
          { flex_office_widget_id: body.search },
          { config_json: { contains: body.search } },
        ],
      }),
  };

  const orderByField =
    typeof body.orderBy === "string" && body.orderBy !== ""
      ? body.orderBy
      : "created_at";

  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_kpi_widgets.findMany({
      where: whereCondition,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
      select: { id: true, flex_office_widget_id: true, created_at: true },
    }),
    MyGlobal.prisma.flex_office_kpi_widgets.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      flex_office_widget_id: r.flex_office_widget_id,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
