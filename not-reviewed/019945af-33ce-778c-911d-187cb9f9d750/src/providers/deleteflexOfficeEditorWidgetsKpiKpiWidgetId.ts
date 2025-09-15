import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Soft delete a KPI widget identified by kpiWidgetId.
 *
 * This action sets the deleted_at timestamp to mark the KPI widget as deleted.
 * Only authorized editors are permitted to perform this operation.
 *
 * @param props - Object containing the editor payload and KPI widget ID.
 * @param props.editor - Authenticated editor performing the deletion.
 * @param props.kpiWidgetId - UUID of the KPI widget to be soft deleted.
 * @returns Void
 * @throws {Error} If the KPI widget does not exist.
 */
export async function deleteflexOfficeEditorWidgetsKpiKpiWidgetId(props: {
  editor: EditorPayload;
  kpiWidgetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, kpiWidgetId } = props;

  await MyGlobal.prisma.flex_office_kpi_widgets.findUniqueOrThrow({
    where: { id: kpiWidgetId },
  });

  await MyGlobal.prisma.flex_office_kpi_widgets.update({
    where: { id: kpiWidgetId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
