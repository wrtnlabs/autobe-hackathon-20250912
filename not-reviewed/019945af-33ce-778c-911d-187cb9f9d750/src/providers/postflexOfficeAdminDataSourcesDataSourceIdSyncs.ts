import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new synchronization task for an external data source within
 * FlexOffice.
 *
 * This operation creates and stores a new record in the
 * flex_office_data_source_syncs table, associating it with the specified data
 * source ID. The sync record contains scheduling information, current status,
 * and optional execution timestamps and error messages.
 *
 * Authorization: Only admins can perform this operation.
 *
 * @param props - The properties for creating the sync task
 * @param props.admin - The authenticated admin performing the operation
 * @param props.dataSourceId - The UUID of the data source to synchronize
 * @param props.body - The sync creation parameters conforming to
 *   IFlexOfficeDataSourceSync.ICreate
 * @returns The newly created synchronization record with all fields
 * @throws {Error} If the specified data source does not exist
 */
export async function postflexOfficeAdminDataSourcesDataSourceIdSyncs(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceSync.ICreate;
}): Promise<IFlexOfficeDataSourceSync> {
  const { admin, dataSourceId, body } = props;

  // Verify that the data source exists
  const dataSource = await MyGlobal.prisma.flex_office_data_sources.findUnique({
    where: { id: dataSourceId },
  });
  if (!dataSource) throw new Error(`Data source not found: ${dataSourceId}`);

  // Get current timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Create the new sync record
  const created = await MyGlobal.prisma.flex_office_data_source_syncs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      flex_office_data_source_id: dataSourceId,
      scheduled_at: body.scheduled_at,
      started_at: body.started_at ?? null,
      completed_at: body.completed_at ?? null,
      status: body.status,
      error_message: body.error_message ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created record with all dates converted to ISO strings safely
  return {
    id: created.id,
    flex_office_data_source_id: created.flex_office_data_source_id,
    scheduled_at: toISOStringSafe(created.scheduled_at),
    started_at: created.started_at ? toISOStringSafe(created.started_at) : null,
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    status: created.status,
    error_message: created.error_message ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
