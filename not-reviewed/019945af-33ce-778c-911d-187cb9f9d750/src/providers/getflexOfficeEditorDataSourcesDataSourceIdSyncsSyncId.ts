import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve detailed synchronization status by ID for a data source.
 *
 * This endpoint returns synchronization metadata for a specific sync task
 * identified by syncId under the given dataSourceId. Access is restricted to
 * authorized editors.
 *
 * @param props - Input parameters including editor identification
 * @param props.editor - Authenticated editor payload
 * @param props.dataSourceId - UUID of the data source
 * @param props.syncId - UUID of the synchronization record
 * @returns Synchronization record details matching IFlexOfficeDataSourceSync
 * @throws {Error} Throws if sync record is not found
 */
export async function getflexOfficeEditorDataSourcesDataSourceIdSyncsSyncId(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  syncId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeDataSourceSync> {
  const { editor, dataSourceId, syncId } = props;

  const record =
    await MyGlobal.prisma.flex_office_data_source_syncs.findUniqueOrThrow({
      where: {
        id: syncId,
        flex_office_data_source_id: dataSourceId,
      },
    });

  return {
    id: record.id,
    flex_office_data_source_id: record.flex_office_data_source_id,
    scheduled_at: toISOStringSafe(record.scheduled_at),
    started_at: record.started_at ? toISOStringSafe(record.started_at) : null,
    completed_at: record.completed_at
      ? toISOStringSafe(record.completed_at)
      : null,
    status: record.status,
    error_message: record.error_message ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
