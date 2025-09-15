import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete an external sheet linked to a data source by marking it as
 * deleted via the 'deleted_at' timestamp.
 *
 * Only authorized admin users can perform this operation to ensure data
 * integrity and compliance.
 *
 * @param props - Object containing required admin credentials and identifiers.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.dataSourceId - Unique identifier of the target data source.
 * @param props.sheetId - Unique identifier of the target external sheet.
 * @returns Void
 * @throws {Error} If the external sheet is not found or already deleted.
 */
export async function deleteflexOfficeAdminDataSourcesDataSourceIdExternalSheetsSheetId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  sheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, dataSourceId, sheetId } = props;

  const existingSheet =
    await MyGlobal.prisma.flex_office_external_sheets.findFirst({
      where: {
        id: sheetId,
        flex_office_data_source_id: dataSourceId,
        deleted_at: null,
      },
    });

  if (!existingSheet) {
    throw new Error("External sheet not found or already deleted");
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.flex_office_external_sheets.update({
    where: { id: sheetId },
    data: {
      deleted_at: now,
    },
  });
}
