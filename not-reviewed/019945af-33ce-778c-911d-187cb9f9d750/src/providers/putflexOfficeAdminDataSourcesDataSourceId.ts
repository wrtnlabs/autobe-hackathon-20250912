import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing data source configuration.
 *
 * This operation updates the fields name, type, connection_info, and is_active
 * for the data source identified by dataSourceId. It preserves the created_at
 * field and updates updated_at to the current time.
 *
 * Authorization: Only admins can perform this update.
 *
 * @param props - Parameters including admin payload, data source ID, and update
 *   body
 * @returns The updated data source object conforming to IFlexOfficeDataSource
 * @throws {Error} If the targeted data source does not exist
 */
export async function putflexOfficeAdminDataSourcesDataSourceId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSource.IUpdate;
}): Promise<IFlexOfficeDataSource> {
  const { admin, dataSourceId, body } = props;

  const existing = await MyGlobal.prisma.flex_office_data_sources.findUnique({
    where: { id: dataSourceId },
  });

  if (!existing) {
    throw new Error("Data source not found");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.flex_office_data_sources.update({
    where: { id: dataSourceId },
    data: {
      name: body.name ?? undefined,
      type: body.type ?? undefined,
      connection_info: body.connection_info ?? undefined,
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
