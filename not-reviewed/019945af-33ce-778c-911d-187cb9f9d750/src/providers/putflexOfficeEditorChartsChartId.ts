import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing analytics chart in FlexOffice system.
 *
 * Allows modification of chart properties such as type, title, description,
 * with strict authorization for editor role.
 *
 * @param props - Contains editor authorization payload, chart ID to update, and
 *   update body.
 * @param props.editor - Authenticated editor payload.
 * @param props.chartId - UUID of the target chart to update.
 * @param props.body - Update data conforming to IFlexOfficeChart.IUpdate.
 * @returns The updated IFlexOfficeChart entity with all fields and timestamps.
 * @throws {Error} Throws if the target chart does not exist.
 */
export async function putflexOfficeEditorChartsChartId(props: {
  editor: EditorPayload;
  chartId: string & tags.Format<"uuid">;
  body: IFlexOfficeChart.IUpdate;
}): Promise<IFlexOfficeChart> {
  const { editor, chartId, body } = props;

  // Authorization must be handled externally; editor role is guaranteed

  const existed = await MyGlobal.prisma.flex_office_charts.findUniqueOrThrow({
    where: { id: chartId },
  });

  const updateData: Partial<IFlexOfficeChart.IUpdate> = {
    flex_office_widget_id:
      body.flex_office_widget_id === null
        ? undefined
        : body.flex_office_widget_id,
    chart_type: body.chart_type ?? undefined,
    title: body.title ?? undefined,
    description: body.description ?? undefined,
  };

  const updated = await MyGlobal.prisma.flex_office_charts.update({
    where: { id: chartId },
    data: updateData,
  });

  return {
    id: updated.id,
    flex_office_widget_id: updated.flex_office_widget_id,
    chart_type: updated.chart_type,
    title: updated.title,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
