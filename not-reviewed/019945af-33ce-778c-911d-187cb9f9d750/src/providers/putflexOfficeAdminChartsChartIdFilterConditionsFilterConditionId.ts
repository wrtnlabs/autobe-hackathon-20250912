import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putflexOfficeAdminChartsChartIdFilterConditionsFilterConditionId(props: {
  admin: AdminPayload;
  chartId: string;
  filterConditionId: string;
  body: IFlexOfficeFilterCondition.IUpdate;
}): Promise<IFlexOfficeFilterCondition> {
  const { admin, chartId, filterConditionId, body } = props;

  const existing =
    await MyGlobal.prisma.flex_office_filter_conditions.findFirstOrThrow({
      where: {
        id: filterConditionId,
        flex_office_chart_id: chartId,
      },
    });

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.flex_office_filter_conditions.update({
    where: { id: filterConditionId },
    data: {
      ...(body.flex_office_chart_id !== undefined && {
        flex_office_chart_id: body.flex_office_chart_id,
      }),
      flex_office_widget_id:
        body.flex_office_widget_id === null
          ? null
          : (body.flex_office_widget_id ?? undefined),
      ...(body.filter_expression !== undefined && {
        filter_expression: body.filter_expression,
      }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    flex_office_chart_id: updated.flex_office_chart_id,
    flex_office_widget_id:
      updated.flex_office_widget_id === undefined
        ? undefined
        : (updated.flex_office_widget_id ?? null),
    filter_expression: updated.filter_expression,
    enabled: updated.enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
