import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new analytics chart in the FlexOffice system.
 *
 * This endpoint allows an authenticated editor to create a new chart record. It
 * generates a unique ID and sets creation and update timestamps. The chart is
 * associated with an existing UI widget and includes type, title, and optional
 * description.
 *
 * @param props - Object containing the editor payload and chart creation data
 * @param props.editor - The authenticated editor making the request
 * @param props.body - The data required to create the chart
 * @returns The newly created IFlexOfficeChart entity
 * @throws {Error} Throws Prisma client errors or database constraint violations
 */
export async function postflexOfficeEditorCharts(props: {
  editor: EditorPayload;
  body: IFlexOfficeChart.ICreate;
}): Promise<IFlexOfficeChart> {
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const created = await MyGlobal.prisma.flex_office_charts.create({
    data: {
      id: id,
      flex_office_widget_id: props.body.flex_office_widget_id,
      chart_type: props.body.chart_type,
      title: props.body.title,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    flex_office_widget_id: created.flex_office_widget_id,
    chart_type: created.chart_type,
    title: created.title,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
