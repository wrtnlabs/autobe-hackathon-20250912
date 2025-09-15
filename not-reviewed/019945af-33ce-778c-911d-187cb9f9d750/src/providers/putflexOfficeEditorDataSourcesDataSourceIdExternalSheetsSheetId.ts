import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update metadata details of an existing external sheet associated with a data
 * source.
 *
 * This endpoint allows an authenticated editor to update file name, URL, sheet
 * count, and last synced timestamp for the specified external sheet under the
 * given data source.
 *
 * It first validates that the external sheet exists, is associated with the
 * data source, and is not soft deleted.
 *
 * The update modifies only provided fields and updates the last updated
 * timestamp.
 *
 * @param props - The request parameters including authentication, path params,
 *   and update body
 * @param props.editor - Authenticated editor performing the update
 * @param props.dataSourceId - UUID of the data source the external sheet
 *   belongs to
 * @param props.sheetId - UUID of the external sheet to update
 * @param props.body - The fields to update on the external sheet
 * @returns The updated external sheet metadata record
 * @throws {Error} When the external sheet does not exist or does not belong to
 *   the data source
 */
export async function putflexOfficeEditorDataSourcesDataSourceIdExternalSheetsSheetId(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  sheetId: string & tags.Format<"uuid">;
  body: IFlexOfficeExternalSheet.IUpdate;
}): Promise<IFlexOfficeExternalSheet> {
  const { editor, dataSourceId, sheetId, body } = props;

  // Fetch the external sheet record, must exist and not deleted
  const existing =
    await MyGlobal.prisma.flex_office_external_sheets.findUniqueOrThrow({
      where: { id: sheetId },
    });

  // Check that it belongs to provided data source and is not deleted
  if (
    existing.flex_office_data_source_id !== dataSourceId ||
    existing.deleted_at !== null
  ) {
    throw new Error(
      "External sheet not found for given dataSourceId and sheetId",
    );
  }

  // Prepare update data
  const updateData: Partial<IFlexOfficeExternalSheet.IUpdate> = {};
  if (body.file_name !== undefined) updateData.file_name = body.file_name;
  if (body.file_url !== undefined) updateData.file_url = body.file_url;
  if (body.sheet_count !== undefined) updateData.sheet_count = body.sheet_count;
  if (body.last_synced_at !== undefined)
    updateData.last_synced_at = body.last_synced_at;

  // Add updated_at timestamp
  updateData.updated_at = toISOStringSafe(new Date());

  // Update the record
  const updated = await MyGlobal.prisma.flex_office_external_sheets.update({
    where: { id: sheetId },
    data: updateData,
  });

  // Return updated record with dates converted
  return {
    id: updated.id,
    flex_office_data_source_id: updated.flex_office_data_source_id,
    file_name: updated.file_name,
    file_url: updated.file_url,
    sheet_count: updated.sheet_count,
    last_synced_at: updated.last_synced_at
      ? toISOStringSafe(updated.last_synced_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
