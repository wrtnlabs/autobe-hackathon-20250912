import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve metadata of a specific external sheet linked to a data source.
 *
 * This operation fetches detailed information about an external sheet
 * identified by sheetId and associated with the specified dataSourceId. The
 * returned metadata includes file name, access URL, sheet count,
 * synchronization timestamps, and audit timestamps.
 *
 * Authorization is enforced for admin users only.
 *
 * @param props - Object containing the admin payload, dataSourceId, and sheetId
 * @param props.admin - The authenticated admin performing the request
 * @param props.dataSourceId - UUID of the data source
 * @param props.sheetId - UUID of the external sheet
 * @returns The external sheet metadata object
 * @throws {Error} Throws if the specified external sheet is not found
 */
export async function getflexOfficeAdminDataSourcesDataSourceIdExternalSheetsSheetId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  sheetId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeExternalSheet> {
  const { admin, dataSourceId, sheetId } = props;

  const record =
    await MyGlobal.prisma.flex_office_external_sheets.findUniqueOrThrow({
      where: {
        id: sheetId,
        flex_office_data_source_id: dataSourceId,
      },
    });

  return {
    id: record.id,
    flex_office_data_source_id: record.flex_office_data_source_id,
    file_name: record.file_name,
    file_url: record.file_url,
    sheet_count: record.sheet_count,
    last_synced_at: record.last_synced_at
      ? toISOStringSafe(record.last_synced_at)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
