import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Get detailed information on a specific KPI widget.
 *
 * Retrieves detailed information of a KPI widget identified by kpiWidgetId.
 * This includes configuration JSON, creation and update timestamps, and soft
 * delete status.
 *
 * Security considerations: Access restricted to users with 'admin' or 'editor'
 * roles. Unauthorized access attempts are denied.
 *
 * @param props - Object containing the authenticated editor and KPI widget ID
 * @param props.editor - Authenticated editor user making the request
 * @param props.kpiWidgetId - UUID of the KPI widget to retrieve
 * @returns The KPI widget with full details
 * @throws {Error} When the KPI widget with given ID does not exist
 */
export async function getflexOfficeEditorWidgetsKpiKpiWidgetId(props: {
  editor: EditorPayload;
  kpiWidgetId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeKpiWidget> {
  const { editor, kpiWidgetId } = props;

  // Authorization is assumed to be handled by decorator/middleware before this point

  const record =
    await MyGlobal.prisma.flex_office_kpi_widgets.findUniqueOrThrow({
      where: { id: kpiWidgetId },
    });

  return {
    id: record.id as string & tags.Format<"uuid">,
    flex_office_widget_id: record.flex_office_widget_id as string &
      tags.Format<"uuid">,
    config_json: record.config_json,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
