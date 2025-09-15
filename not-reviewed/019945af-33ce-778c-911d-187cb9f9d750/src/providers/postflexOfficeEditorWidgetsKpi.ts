import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a KPI widget
 *
 * This endpoint creates a new KPI widget record linked to a UI widget, storing
 * JSON configuration data specifying data queries, aggregation, and display
 * options for dashboard visualization.
 *
 * Only authenticated users with the "editor" role are authorized to create KPI
 * widgets.
 *
 * @param props - The request props containing authenticated editor and body
 *   with KPI creation data
 * @param props.editor - The authenticated editor making the request
 * @param props.body - KPI widget creation data (configuration JSON)
 * @returns The newly created KPI widget record
 * @throws {Error} When any unexpected error occurs during database operation
 */
export async function postflexOfficeEditorWidgetsKpi(props: {
  editor: EditorPayload;
  body: IFlexOfficeKpiWidget.ICreate;
}): Promise<IFlexOfficeKpiWidget> {
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_kpi_widgets.create({
    data: {
      id: id,
      flex_office_widget_id: props.body.flex_office_widget_id,
      config_json: props.body.config_json,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    flex_office_widget_id: created.flex_office_widget_id,
    config_json: created.config_json,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
