import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed synchronization status by syncId and dataSourceId.
 *
 * Fetches a single record from flex_office_data_source_syncs matching the
 * composite key. Converts all date fields to ISO8601 strings with proper null
 * handling.
 *
 * @param props - Contains admin payload for authorization and identifiers for
 *   data source and sync record
 * @param props.admin - The authenticated admin performing the request
 * @param props.dataSourceId - UUID of the data source
 * @param props.syncId - UUID of the sync record
 * @returns The synchronization record details conforming to
 *   IFlexOfficeDataSourceSync
 * @throws {Error} Throws if no sync record matches the provided identifiers
 */
export async function getflexOfficeAdminDataSourcesDataSourceIdSyncsSyncId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  syncId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeDataSourceSync> {
  const { admin, dataSourceId, syncId } = props;

  const syncRecord =
    await MyGlobal.prisma.flex_office_data_source_syncs.findFirstOrThrow({
      where: {
        id: syncId,
        flex_office_data_source_id: dataSourceId,
      },
    });

  return {
    id: syncRecord.id,
    flex_office_data_source_id: syncRecord.flex_office_data_source_id,
    scheduled_at: toISOStringSafe(syncRecord.scheduled_at),
    started_at:
      syncRecord.started_at === null
        ? null
        : toISOStringSafe(syncRecord.started_at),
    completed_at:
      syncRecord.completed_at === null
        ? null
        : toISOStringSafe(syncRecord.completed_at),
    status: syncRecord.status,
    error_message: syncRecord.error_message ?? null,
    created_at: toISOStringSafe(syncRecord.created_at),
    updated_at: toISOStringSafe(syncRecord.updated_at),
  };
}
