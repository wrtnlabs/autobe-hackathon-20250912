import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing KPI widget.
 *
 * This operation updates an existing KPI widget identified by kpiWidgetId in
 * the database. Authorization is assumed to be handled externally, ensuring
 * only users with proper roles can perform this operation.
 *
 * @param props - Object containing authenticated editor, KPI widget ID, and
 *   update body
 * @param props.editor - The authenticated editor performing the update
 * @param props.kpiWidgetId - UUID of the KPI widget to update
 * @param props.body - Partial update data for the KPI widget
 * @returns The updated KPI widget
 * @throws Error if the KPI widget does not exist
 */
export async function putflexOfficeEditorWidgetsKpiKpiWidgetId(props: {
  editor: EditorPayload;
  kpiWidgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeKpiWidget.IUpdate;
}): Promise<IFlexOfficeKpiWidget> {
  const { editor, kpiWidgetId, body } = props;

  // Confirm KPI widget exists
  await MyGlobal.prisma.flex_office_kpi_widgets.findUniqueOrThrow({
    where: { id: kpiWidgetId },
  });

  const updated = await MyGlobal.prisma.flex_office_kpi_widgets.update({
    where: { id: kpiWidgetId },
    data: {
      flex_office_widget_id: body.flex_office_widget_id ?? undefined,
      config_json: body.config_json ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    flex_office_widget_id: updated.flex_office_widget_id,
    config_json: updated.config_json,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
