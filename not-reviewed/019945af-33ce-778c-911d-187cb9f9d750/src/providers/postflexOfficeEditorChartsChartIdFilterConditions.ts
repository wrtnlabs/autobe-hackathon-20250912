import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new filter condition for a specific chart in the FlexOffice
 * platform.
 *
 * This operation accepts filter condition details such as the filter expression
 * and enablement flag, creates a new filter condition record linked to the
 * specified chart, and returns the newly created entity.
 *
 * Only authenticated editors are authorized to perform this operation.
 *
 * @param props - The properties needed to create the filter condition
 * @param props.editor - The authenticated editor payload performing the
 *   operation
 * @param props.chartId - The UUID identifying the chart to which the filter
 *   condition will be linked
 * @param props.body - The body containing filter condition data (
 *   filter_expression, enabled, and optional widget ID)
 * @returns The newly created filter condition entity conforming to
 *   IFlexOfficeFilterCondition
 * @throws {Error} Throws if database operation fails
 */
export async function postflexOfficeEditorChartsChartIdFilterConditions(props: {
  editor: EditorPayload;
  chartId: string;
  body: IFlexOfficeFilterCondition.ICreate;
}): Promise<IFlexOfficeFilterCondition> {
  const { editor, chartId, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_filter_conditions.create({
    data: {
      id: id,
      flex_office_chart_id: chartId,
      flex_office_widget_id: body.flex_office_widget_id ?? null,
      filter_expression: body.filter_expression,
      enabled: body.enabled,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    flex_office_chart_id: created.flex_office_chart_id as string &
      tags.Format<"uuid">,
    flex_office_widget_id: created.flex_office_widget_id ?? null,
    filter_expression: created.filter_expression,
    enabled: created.enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
