import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Permanently deletes an existing FlexOffice chart by its unique identifier.
 *
 * This operation performs a hard delete, removing the chart record entirely
 * from the system. It requires the chart to exist and not be soft deleted.
 * Throws an error if the chart does not exist. Authorization requires the
 * requester to have editor privileges.
 *
 * @param props - Object containing the authenticated editor and the target
 *   chart UUID.
 * @param props.editor - The authenticated editor performing the delete
 *   operation.
 * @param props.chartId - UUID of the chart to be deleted.
 * @throws {Error} If the chart does not exist or is already deleted.
 */
export async function deleteflexOfficeEditorChartsChartId(props: {
  editor: EditorPayload;
  chartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, chartId } = props;

  const chart = await MyGlobal.prisma.flex_office_charts.findFirst({
    where: {
      id: chartId,
      deleted_at: null,
    },
  });

  if (!chart) throw new Error("Chart not found");

  await MyGlobal.prisma.flex_office_charts.delete({
    where: {
      id: chartId,
    },
  });
}
