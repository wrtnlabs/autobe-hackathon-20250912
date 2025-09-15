import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update synchronization task details for a specific data source.
 *
 * This operation updates the status, scheduling, start/end times, or error
 * information of a sync record identified by dataSourceId and syncId. Only
 * administrators are authorized.
 *
 * @param props - Object containing admin payload, dataSourceId, syncId, and
 *   update data
 * @param props.admin - Authenticated admin making the update request
 * @param props.dataSourceId - UUID of the data source owning the sync task
 * @param props.syncId - UUID of the sync task to update
 * @param props.body - Partial update data according to
 *   IFlexOfficeDataSourceSync.IUpdate
 * @returns The updated synchronization record with all fields
 * @throws {Error} When the sync record is not found
 */
export async function putflexOfficeAdminDataSourcesDataSourceIdSyncsSyncId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  syncId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceSync.IUpdate;
}): Promise<IFlexOfficeDataSourceSync> {
  const { admin, dataSourceId, syncId, body } = props;

  // Check existing sync record
  const existingSync =
    await MyGlobal.prisma.flex_office_data_source_syncs.findUniqueOrThrow({
      where: {
        id: syncId,
        flex_office_data_source_id: dataSourceId,
      },
    });

  // Build update data with timestamp conversions and null handling
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updateData: IFlexOfficeDataSourceSync.IUpdate = {
    ...(body.flex_office_data_source_id !== undefined
      ? { flex_office_data_source_id: body.flex_office_data_source_id }
      : {}),
    ...(body.scheduled_at !== undefined
      ? { scheduled_at: toISOStringSafe(body.scheduled_at) }
      : {}),
    ...(body.started_at !== undefined
      ? {
          started_at:
            body.started_at === null ? null : toISOStringSafe(body.started_at),
        }
      : {}),
    ...(body.completed_at !== undefined
      ? {
          completed_at:
            body.completed_at === null
              ? null
              : toISOStringSafe(body.completed_at),
        }
      : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.error_message !== undefined
      ? {
          error_message:
            body.error_message === null ? null : body.error_message,
        }
      : {}),
    updated_at: now,
  };

  // Perform update
  const updated = await MyGlobal.prisma.flex_office_data_source_syncs.update({
    where: {
      id: syncId,
      flex_office_data_source_id: dataSourceId,
    },
    data: updateData,
  });

  // Return normalized updated sync with date conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    flex_office_data_source_id: updated.flex_office_data_source_id as string &
      tags.Format<"uuid">,
    scheduled_at: toISOStringSafe(updated.scheduled_at),
    started_at: updated.started_at ? toISOStringSafe(updated.started_at) : null,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    status: updated.status,
    error_message: updated.error_message ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
