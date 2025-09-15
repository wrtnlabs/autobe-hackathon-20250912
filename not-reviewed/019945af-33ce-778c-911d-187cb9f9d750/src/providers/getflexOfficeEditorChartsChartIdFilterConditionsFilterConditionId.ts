import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieves a specific filter condition entity associated with a given chart.
 *
 * Fetches detailed information about a single filter condition identified by
 * both the chart and filter condition IDs.
 *
 * Authorization is enforced by requiring a valid editor payload.
 *
 * @param props - Object containing the authenticated editor and identifiers
 * @param props.editor - Authenticated editor user payload
 * @param props.chartId - Unique identifier of the target chart
 * @param props.filterConditionId - Unique identifier of the target filter
 *   condition
 * @returns The detailed filter condition information conforming to
 *   IFlexOfficeFilterCondition
 * @throws {Error} When the filter condition does not exist or authorization
 *   fails
 */
export async function getflexOfficeEditorChartsChartIdFilterConditionsFilterConditionId(props: {
  editor: EditorPayload;
  chartId: string;
  filterConditionId: string;
}): Promise<IFlexOfficeFilterCondition> {
  const { editor, chartId, filterConditionId } = props;

  const record =
    await MyGlobal.prisma.flex_office_filter_conditions.findFirstOrThrow({
      where: {
        id: filterConditionId,
        flex_office_chart_id: chartId,
      },
    });

  return {
    id: record.id,
    flex_office_chart_id: record.flex_office_chart_id,
    flex_office_widget_id: record.flex_office_widget_id ?? undefined,
    filter_expression: record.filter_expression,
    enabled: record.enabled,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
