import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an external sheet metadata record for a given data source and sheet.
 *
 * This operation updates fields such as file name, file URL, sheet count, and
 * last synchronization timestamp for the specified external sheet. It requires
 * an authenticated admin user, and ensures the record exists and belongs to the
 * given data source.
 *
 * @param props - The operation parameters.
 * @param props.admin - The authenticated admin performing the update.
 * @param props.dataSourceId - UUID of the data source linked to the sheet.
 * @param props.sheetId - UUID of the external sheet to update.
 * @param props.body - Partial fields to update on the external sheet.
 * @returns The updated external sheet metadata record.
 * @throws {Error} When the external sheet record is not found.
 */
export async function putflexOfficeAdminDataSourcesDataSourceIdExternalSheetsSheetId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  sheetId: string & tags.Format<"uuid">;
  body: IFlexOfficeExternalSheet.IUpdate;
}): Promise<IFlexOfficeExternalSheet> {
  const { admin, dataSourceId, sheetId, body } = props;

  // Find the existing external sheet record
  const existing = await MyGlobal.prisma.flex_office_external_sheets.findFirst({
    where: {
      id: sheetId,
      flex_office_data_source_id: dataSourceId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new Error(
      `External sheet not found for id: ${sheetId} under dataSource: ${dataSourceId}`,
    );
  }

  // Update external sheet with provided fields
  const updated = await MyGlobal.prisma.flex_office_external_sheets.update({
    where: { id: sheetId },
    data: {
      file_name: body.file_name ?? undefined,
      file_url: body.file_url ?? undefined,
      sheet_count: body.sheet_count ?? undefined,
      last_synced_at:
        body.last_synced_at === null
          ? null
          : (body.last_synced_at ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

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
