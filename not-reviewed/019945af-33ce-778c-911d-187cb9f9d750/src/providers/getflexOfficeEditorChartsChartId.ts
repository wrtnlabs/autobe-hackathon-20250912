import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve detailed information of a specific analytics chart by its unique ID.
 *
 * This operation is accessible by authenticated users with the Editor role. It
 * fetches all metadata fields of the chart including timestamps and soft
 * deletion status.
 *
 * @param props - Object containing parameters:
 *
 *   - Editor: The authenticated EditorPayload performing the operation.
 *   - ChartId: UUID string of the chart to retrieve.
 *
 * @returns The detailed IFlexOfficeChart information.
 * @throws {Error} Throws if the chart does not exist.
 */
export async function getflexOfficeEditorChartsChartId(props: {
  editor: EditorPayload;
  chartId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeChart> {
  const { chartId } = props;

  const chart = await MyGlobal.prisma.flex_office_charts.findUniqueOrThrow({
    where: { id: chartId },
  });

  return {
    id: chart.id,
    flex_office_widget_id: chart.flex_office_widget_id,
    chart_type: chart.chart_type,
    title: chart.title,
    description: chart.description ?? null,
    created_at: toISOStringSafe(chart.created_at),
    updated_at: toISOStringSafe(chart.updated_at),
    deleted_at: chart.deleted_at ? toISOStringSafe(chart.deleted_at) : null,
  };
}
