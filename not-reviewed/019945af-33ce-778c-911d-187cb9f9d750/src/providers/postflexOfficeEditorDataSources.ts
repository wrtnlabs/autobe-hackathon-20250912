import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Creates a new external data source configuration in the FlexOffice system.
 *
 * This operation requires an authenticated editor role. Validates uniqueness of
 * the name and correctness of connection details (assumed upstream).
 *
 * The data source type supports mysql, postgresql, google_sheet, excel.
 *
 * @param props - Object containing the editor authentication and data source
 *   creation body
 * @param props.editor - The authenticated editor user payload
 * @param props.body - Data source creation information
 * @returns The newly created FlexOffice data source
 * @throws {Error} Prisma/database errors, including unique constraint
 *   violations
 */
export async function postflexOfficeEditorDataSources(props: {
  editor: EditorPayload;
  body: IFlexOfficeDataSource.ICreate;
}): Promise<IFlexOfficeDataSource> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_data_sources.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: props.body.name,
      type: props.body.type,
      connection_info: props.body.connection_info,
      is_active: props.body.is_active,
      created_at: now,
      updated_at: now,
      deleted_at: props.body.deleted_at ?? undefined,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    type: created.type,
    connection_info: created.connection_info,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
