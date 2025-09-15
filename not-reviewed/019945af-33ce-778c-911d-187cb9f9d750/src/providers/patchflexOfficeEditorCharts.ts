import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import { IPageIFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeChart";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Searches and retrieves a paginated list of analytics chart metadata.
 *
 * This operation allows authenticated editors to filter charts by type, title,
 * and description, with support for pagination and ordering by creation or
 * update date. Soft-deleted charts are excluded by default, or can be filtered
 * using the enabled flag.
 *
 * @param props - An object containing the authenticated editor and filter
 *   parameters.
 * @param props.editor - The authenticated editor payload for authorization
 *   context.
 * @param props.body - The request body containing search and pagination
 *   filters.
 * @returns A paginated list of chart metadata matching the search criteria.
 * @throws {Error} If database access fails or parameters are invalid.
 */
export async function patchflexOfficeEditorCharts(props: {
  editor: EditorPayload;
  body: IFlexOfficeChart.IRequest;
}): Promise<IPageIFlexOfficeChart> {
  const { editor, body } = props;

  const allowedOrderFields = ["created_at", "updated_at"];
  const orderByField =
    typeof body.orderBy === "string" &&
    allowedOrderFields.includes(body.orderBy)
      ? body.orderBy
      : "created_at";

  const orderDirection =
    body.orderDir === "asc" || body.orderDir === "desc"
      ? body.orderDir
      : "desc";

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereConditions = {
    deleted_at: null as null,
  } as {
    deleted_at: null;
    chart_type?: string;
    title?: { contains: string };
    description?: { contains: string };
  };

  if (body.chart_type !== undefined && body.chart_type !== null) {
    whereConditions.chart_type = body.chart_type;
  }

  if (body.title_search !== undefined && body.title_search !== null) {
    whereConditions.title = { contains: body.title_search };
  }

  if (
    body.description_search !== undefined &&
    body.description_search !== null
  ) {
    whereConditions.description = { contains: body.description_search };
  }

  if (body.enabled !== undefined && body.enabled !== null) {
    if (body.enabled === true) {
      whereConditions.deleted_at = null;
    } else {
      whereConditions.deleted_at = { not: null };
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_charts.findMany({
      where: whereConditions,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_charts.count({
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
    data: results.map((chart) => ({
      id: chart.id,
      flex_office_widget_id: chart.flex_office_widget_id,
      chart_type: chart.chart_type,
      title: chart.title,
      description: chart.description ?? null,
      created_at: toISOStringSafe(chart.created_at),
      updated_at: toISOStringSafe(chart.updated_at),
      deleted_at: chart.deleted_at ? toISOStringSafe(chart.deleted_at) : null,
    })),
  };
}
