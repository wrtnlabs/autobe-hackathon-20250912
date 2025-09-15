import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new filter condition for a specific chart
 *
 * This operation creates and stores a filter condition linked to the given
 * chart ID. It requires administrative privileges.
 *
 * @param props - Object containing admin, chartId, and request body with filter
 *   condition data
 * @param props.admin - Authenticated admin payload
 * @param props.chartId - UUID of the chart where filter condition will be
 *   created
 * @param props.body - Details for the new filter condition
 * @returns The created filter condition entity with all relevant fields
 * @throws {Error} Errors from Prisma client or internal failures
 */
export async function postflexOfficeAdminChartsChartIdFilterConditions(props: {
  admin: AdminPayload;
  chartId: string & tags.Format<"uuid">;
  body: IFlexOfficeFilterCondition.ICreate;
}): Promise<IFlexOfficeFilterCondition> {
  const { admin, chartId, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_filter_conditions.create({
    data: {
      id,
      flex_office_chart_id: chartId,
      flex_office_widget_id: body.flex_office_widget_id ?? null,
      filter_expression: body.filter_expression,
      enabled: body.enabled,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    flex_office_chart_id: created.flex_office_chart_id,
    flex_office_widget_id: created.flex_office_widget_id ?? null,
    filter_expression: created.filter_expression,
    enabled: created.enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
