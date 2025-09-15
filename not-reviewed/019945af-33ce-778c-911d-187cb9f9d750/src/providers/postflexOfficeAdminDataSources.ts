import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new data source configuration.
 *
 * This operation creates a new external data source configuration in the
 * flex_office_data_sources table. It checks for uniqueness of the name and
 * validates the format of the connection information. Timestamps are recorded
 * and the newly created record is returned. Only users with admin privileges
 * may perform this operation.
 *
 * @param props - The properties containing admin authentication and data source
 *   creation information.
 * @param props.admin - The authenticated admin payload performing the
 *   operation.
 * @param props.body - The data source creation details including name, type,
 *   connection_info, and is_active.
 * @returns The newly created data source record conforming to
 *   IFlexOfficeDataSource.
 * @throws {Error} If a data source with the given name already exists.
 * @throws {Error} If the connection_info is empty or invalid JSON.
 */
export async function postflexOfficeAdminDataSources(props: {
  admin: AdminPayload;
  body: IFlexOfficeDataSource.ICreate;
}): Promise<IFlexOfficeDataSource> {
  const { admin, body } = props;

  // Check for existing data source with the same name
  const existing = await MyGlobal.prisma.flex_office_data_sources.findFirst({
    where: { name: body.name },
  });

  if (existing) {
    throw new Error(`Data source with name '${body.name}' already exists.`);
  }

  // Validate connection_info is a non-empty valid JSON string
  if (!body.connection_info.trim()) {
    throw new Error("Connection info cannot be empty.");
  }
  try {
    JSON.parse(body.connection_info);
  } catch {
    throw new Error("Connection info must be a valid JSON string.");
  }

  // Current timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Generate new UUID for the record
  const id = v4() as string & tags.Format<"uuid">;

  // Create new data source record
  const created = await MyGlobal.prisma.flex_office_data_sources.create({
    data: {
      id,
      name: body.name,
      type: body.type,
      connection_info: body.connection_info,
      is_active: body.is_active,
      created_at: now,
      updated_at: now,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return created record with ISO formatted timestamps
  return {
    id: created.id,
    name: created.name,
    type: created.type,
    connection_info: created.connection_info,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
