import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new external sheet metadata record related to the specified data
 * source.
 *
 * This operation checks for uniqueness of the `file_url` to prevent duplicates.
 * It generates a new unique identifier for the external sheet entry.
 * Initializes audit timestamps and sets soft delete field to null. Returns the
 * fully populated external sheet object with ISO 8601 date strings.
 *
 * @param props - Object containing the admin authentication payload,
 *   dataSourceId path parameter, and external sheet creation data.
 * @param props.admin - The authenticated admin user performing the creation.
 * @param props.dataSourceId - UUID of the data source to associate with.
 * @param props.body - The external sheet creation information including file
 *   name, URL, and sheet count.
 * @returns The newly created external sheet metadata record.
 * @throws {Error} When a duplicate file_url is detected.
 */
export async function postflexOfficeAdminDataSourcesDataSourceIdExternalSheets(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeExternalSheet.ICreate;
}): Promise<IFlexOfficeExternalSheet> {
  const { admin, dataSourceId, body } = props;

  // Verify uniqueness of file_url
  const existing = await MyGlobal.prisma.flex_office_external_sheets.findFirst({
    where: { file_url: body.file_url },
  });
  if (existing) throw new Error("Duplicate file_url not allowed");

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_external_sheets.create({
    data: {
      id,
      flex_office_data_source_id: dataSourceId,
      file_name: body.file_name,
      file_url: body.file_url,
      sheet_count: body.sheet_count,
      last_synced_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    flex_office_data_source_id: created.flex_office_data_source_id,
    file_name: created.file_name,
    file_url: created.file_url,
    sheet_count: created.sheet_count,
    last_synced_at: created.last_synced_at
      ? toISOStringSafe(created.last_synced_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
