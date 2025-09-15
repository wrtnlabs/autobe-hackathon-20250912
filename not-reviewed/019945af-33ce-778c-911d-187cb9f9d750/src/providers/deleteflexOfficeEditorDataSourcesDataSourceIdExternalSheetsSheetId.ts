import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Soft delete an external sheet linked to a specific data source.
 *
 * This function marks the targeted external sheet's deleted_at timestamp to
 * perform a soft delete, preserving audit trail and enabling recovery.
 *
 * Access is authorized for editors; ownership or role verification is presumed
 * done before calling this function.
 *
 * @param props - Contains editor payload and identifiers for data source and
 *   sheet
 * @param props.editor - Authenticated editor performing the operation
 * @param props.dataSourceId - UUID of the target data source
 * @param props.sheetId - UUID of the target external sheet
 * @returns Void
 * @throws {Prisma.PrismaClientKnownRequestError} If record not found or other
 *   DB errors
 * @throws {Error} For any unexpected errors
 */
export async function deleteflexOfficeEditorDataSourcesDataSourceIdExternalSheetsSheetId(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  sheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, dataSourceId, sheetId } = props;

  // Verify the external sheet exists and is not already deleted
  await MyGlobal.prisma.flex_office_external_sheets.findFirstOrThrow({
    where: {
      id: sheetId,
      flex_office_data_source_id: dataSourceId,
      deleted_at: null,
    },
  });

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.flex_office_external_sheets.update({
    where: { id: sheetId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
