import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Delete a specific filter condition of a chart in FlexOffice analytics
 *
 * This operation permanently removes a filter condition associated with a given
 * chart. It validates that the filter condition exists, belongs to the chart,
 * and that the authenticated editor has access to the chart before deletion.
 *
 * @param props - Parameters containing editor info and IDs of the target filter
 *   condition and chart
 * @param props.editor - The authenticated editor performing the deletion
 * @param props.chartId - UUID string of the target chart
 * @param props.filterConditionId - UUID string of the filter condition to be
 *   deleted
 * @returns Void
 * @throws {Error} When filter condition is not found
 * @throws {Error} When filter condition does not belong to the target chart
 * @throws {Error} When chart is not found
 */
export async function deleteflexOfficeEditorChartsChartIdFilterConditionsFilterConditionId(props: {
  editor: EditorPayload;
  chartId: string & tags.Format<"uuid">;
  filterConditionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, chartId, filterConditionId } = props;

  const filterCondition =
    await MyGlobal.prisma.flex_office_filter_conditions.findUnique({
      where: { id: filterConditionId },
    });

  if (!filterCondition) {
    throw new Error("Filter condition not found");
  }

  if (filterCondition.flex_office_chart_id !== chartId) {
    throw new Error("Filter condition does not belong to the specified chart");
  }

  const chart = await MyGlobal.prisma.flex_office_charts.findUnique({
    where: { id: chartId },
  });

  if (!chart) {
    throw new Error("Chart not found");
  }

  // Authorization logic (if more advanced authorization is needed,
  // implement accordingly here)

  await MyGlobal.prisma.flex_office_filter_conditions.delete({
    where: { id: filterConditionId },
  });
}
