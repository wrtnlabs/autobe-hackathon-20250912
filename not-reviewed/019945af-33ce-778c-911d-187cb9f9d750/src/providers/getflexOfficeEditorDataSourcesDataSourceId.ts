import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve detailed information of a specific FlexOffice data source by its
 * unique identifier.
 *
 * This operation fetches all configuration parameters, activation status, and
 * audit timestamps for comprehensive client display or management by authorized
 * editors.
 *
 * @param props - Object containing the authenticated editor and the data source
 *   UUID.
 * @param props.editor - The authenticated editor performing the request.
 * @param props.dataSourceId - UUID of the data source to retrieve.
 * @returns The full data source record conforming to IFlexOfficeDataSource.
 * @throws {Error} Throws if the data source with the specified ID does not
 *   exist.
 */
export async function getflexOfficeEditorDataSourcesDataSourceId(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeDataSource> {
  const { dataSourceId } = props;

  const record =
    await MyGlobal.prisma.flex_office_data_sources.findUniqueOrThrow({
      where: { id: dataSourceId },
    });

  return {
    id: record.id,
    name: record.name,
    type: record.type,
    connection_info: record.connection_info,
    is_active: record.is_active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
