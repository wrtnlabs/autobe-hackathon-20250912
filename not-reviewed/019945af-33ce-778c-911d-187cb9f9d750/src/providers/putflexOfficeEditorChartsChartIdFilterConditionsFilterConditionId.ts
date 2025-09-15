import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing filter condition for a specific chart.
 *
 * This function updates the properties of a filter condition identified by its
 * unique filterConditionId and associated with a given chartId. Only fields
 * provided in the update body are modified. The updated timestamp is refreshed
 * automatically.
 *
 * Authorization requires the user to be an editor, verified by the editor
 * payload.
 *
 * @param props - Object containing the editor payload, chart ID, filter
 *   condition ID, and update body.
 * @param props.editor - Authenticated editor performing the update.
 * @param props.chartId - UUID of the chart associated with the filter
 *   condition.
 * @param props.filterConditionId - UUID of the filter condition to update.
 * @param props.body - Partial update data for the filter condition.
 * @returns The updated filter condition data.
 * @throws {Error} If the specified filter condition does not exist.
 */
export async function putflexOfficeEditorChartsChartIdFilterConditionsFilterConditionId(props: {
  editor: EditorPayload;
  chartId: string & tags.Format<"uuid">;
  filterConditionId: string & tags.Format<"uuid">;
  body: IFlexOfficeFilterCondition.IUpdate;
}): Promise<IFlexOfficeFilterCondition> {
  const { editor, chartId, filterConditionId, body } = props;

  const existing =
    await MyGlobal.prisma.flex_office_filter_conditions.findFirst({
      where: {
        id: filterConditionId,
        flex_office_chart_id: chartId,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new Error(`Filter condition with ID ${filterConditionId} not found`);
  }

  const updated = await MyGlobal.prisma.flex_office_filter_conditions.update({
    where: {
      id: filterConditionId,
    },
    data: {
      ...(body.flex_office_chart_id !== undefined && {
        flex_office_chart_id: body.flex_office_chart_id,
      }),
      ...(body.flex_office_widget_id !== undefined && {
        flex_office_widget_id: body.flex_office_widget_id,
      }),
      ...(body.filter_expression !== undefined && {
        filter_expression: body.filter_expression,
      }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    flex_office_chart_id: updated.flex_office_chart_id,
    flex_office_widget_id: updated.flex_office_widget_id ?? null,
    filter_expression: updated.filter_expression,
    enabled: updated.enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
