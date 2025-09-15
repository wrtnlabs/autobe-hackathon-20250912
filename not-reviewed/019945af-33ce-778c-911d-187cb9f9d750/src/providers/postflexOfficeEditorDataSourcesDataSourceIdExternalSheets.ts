import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create an external sheet record for a data source.
 *
 * This function creates a new entry in the 'flex_office_external_sheets' table
 * linked to the specified data source. The caller must provide required
 * metadata including file name, URL, and sheet count. It records audit
 * timestamps and supports soft deletion status.
 *
 * @param props - Object containing the authenticated editor payload, the target
 *   data source ID, and the external sheet creation data.
 * @param props.editor - Authenticated editor's payload with user
 *   identification.
 * @param props.dataSourceId - UUID of the data source to which the external
 *   sheet will be linked.
 * @param props.body - Creation data including file name, URL, and sheet count.
 * @returns The newly created external sheet record with audit and soft delete
 *   properties.
 * @throws {Error} Propagates any error from Prisma client including unique
 *   constraint violations.
 */
export async function postflexOfficeEditorDataSourcesDataSourceIdExternalSheets(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeExternalSheet.ICreate;
}): Promise<IFlexOfficeExternalSheet> {
  const { editor, dataSourceId, body } = props;

  const nowISO = toISOStringSafe(new Date());

  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_external_sheets.create({
    data: {
      id: newId,
      flex_office_data_source_id: dataSourceId,
      file_name: body.file_name,
      file_url: body.file_url,
      sheet_count: body.sheet_count,
      created_at: nowISO,
      updated_at: nowISO,
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
