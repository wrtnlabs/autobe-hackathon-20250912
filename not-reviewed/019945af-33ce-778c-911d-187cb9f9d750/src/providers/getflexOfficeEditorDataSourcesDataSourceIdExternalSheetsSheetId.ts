import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve metadata of a specific external sheet linked to a data source.
 *
 * This operation fetches detailed information about an external sheet
 * identified by the given dataSourceId and sheetId. It returns metadata
 * including file name, file URL, sheet count, timestamps for synchronization,
 * creation, updates, and soft deletion state.
 *
 * Access is restricted to authorized users with the editor role.
 *
 * @param props - Object containing the authenticated editor, data source ID,
 *   and sheet ID.
 * @param props.editor - Authenticated editor user payload.
 * @param props.dataSourceId - UUID of the data source linked to the external
 *   sheet.
 * @param props.sheetId - UUID of the external sheet to retrieve.
 * @returns The external sheet metadata conforming to IFlexOfficeExternalSheet.
 * @throws {Error} When the external sheet is not found with the given
 *   identifiers.
 */
export async function getflexOfficeEditorDataSourcesDataSourceIdExternalSheetsSheetId(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  sheetId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeExternalSheet> {
  const { editor, dataSourceId, sheetId } = props;

  const sheet =
    await MyGlobal.prisma.flex_office_external_sheets.findFirstOrThrow({
      where: {
        flex_office_data_source_id: dataSourceId,
        id: sheetId,
        deleted_at: null,
      },
    });

  return {
    id: sheet.id,
    flex_office_data_source_id: sheet.flex_office_data_source_id,
    file_name: sheet.file_name,
    file_url: sheet.file_url,
    sheet_count: sheet.sheet_count,
    last_synced_at: sheet.last_synced_at
      ? toISOStringSafe(sheet.last_synced_at)
      : null,
    created_at: toISOStringSafe(sheet.created_at),
    updated_at: toISOStringSafe(sheet.updated_at),
    deleted_at: sheet.deleted_at ? toISOStringSafe(sheet.deleted_at) : null,
  };
}
