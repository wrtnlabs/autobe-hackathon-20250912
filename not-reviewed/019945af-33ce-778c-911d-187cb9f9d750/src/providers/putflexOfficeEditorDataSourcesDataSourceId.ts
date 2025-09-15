import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing data source configuration.
 *
 * This operation updates specified fields of an existing data source identified
 * by its UUID. The fields name, type, connection_info, and is_active are
 * editable. The updated_at timestamp is set to the current time.
 *
 * Authorization is restricted to editors.
 *
 * @param props - Object containing editor payload, data source UUID, and update
 *   body
 * @returns The updated data source record
 * @throws {Error} If the data source does not exist or update fails
 */
export async function putflexOfficeEditorDataSourcesDataSourceId(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSource.IUpdate;
}): Promise<IFlexOfficeDataSource> {
  const { editor, dataSourceId, body } = props;

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.flex_office_data_sources.update({
    where: { id: dataSourceId },
    data: {
      name: body.name === null ? null : (body.name ?? undefined),
      type: body.type === null ? null : (body.type ?? undefined),
      connection_info:
        body.connection_info === null
          ? null
          : (body.connection_info ?? undefined),
      is_active: body.is_active ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    type: updated.type,
    connection_info: updated.connection_info,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
