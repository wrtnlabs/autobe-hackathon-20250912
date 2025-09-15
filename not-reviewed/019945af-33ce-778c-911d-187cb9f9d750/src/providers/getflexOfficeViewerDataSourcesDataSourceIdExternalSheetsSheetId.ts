import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Retrieve metadata of a specific external sheet linked to a data source.
 *
 * This operation fetches detailed information about the external sheet
 * identified by the dataSourceId and sheetId, including file name, URL, sheet
 * count, last synchronization timestamp, and audit details.
 *
 * Access is authorized for users with the viewer role.
 *
 * @param props - Object containing viewer authentication and path parameters.
 * @param props.viewer - Authenticated viewer payload.
 * @param props.dataSourceId - UUID of the target data source.
 * @param props.sheetId - UUID of the target external sheet.
 * @returns The detailed external sheet metadata.
 * @throws {Error} When the external sheet is not found for given identifiers.
 */
export async function getflexOfficeViewerDataSourcesDataSourceIdExternalSheetsSheetId(props: {
  viewer: ViewerPayload;
  dataSourceId: string & tags.Format<"uuid">;
  sheetId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeExternalSheet> {
  const { viewer, dataSourceId, sheetId } = props;

  const externalSheet =
    await MyGlobal.prisma.flex_office_external_sheets.findFirstOrThrow({
      where: {
        id: sheetId,
        flex_office_data_source_id: dataSourceId,
        deleted_at: null,
      },
    });

  return {
    id: externalSheet.id,
    flex_office_data_source_id: externalSheet.flex_office_data_source_id,
    file_name: externalSheet.file_name,
    file_url: externalSheet.file_url,
    sheet_count: externalSheet.sheet_count,
    last_synced_at: externalSheet.last_synced_at
      ? toISOStringSafe(externalSheet.last_synced_at)
      : null,
    created_at: toISOStringSafe(externalSheet.created_at),
    updated_at: toISOStringSafe(externalSheet.updated_at),
    deleted_at: externalSheet.deleted_at
      ? toISOStringSafe(externalSheet.deleted_at)
      : null,
  };
}
