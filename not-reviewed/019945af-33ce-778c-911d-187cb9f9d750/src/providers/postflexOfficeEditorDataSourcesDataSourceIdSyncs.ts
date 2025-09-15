import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Creates a new synchronization task for a specified data source in the
 * FlexOffice system.
 *
 * Validates the specified dataSourceId to ensure it references an active,
 * non-deleted data source. Creates a new flex_office_data_source_syncs record
 * with the scheduling and status information provided. The system sets creation
 * and update timestamps automatically.
 *
 * Authorization: Limited to users with 'editor' role.
 *
 * @param props - Object containing the editor payload, the data source ID, and
 *   the creation body.
 * @param props.editor - The authenticated editor triggering the sync.
 * @param props.dataSourceId - UUID of the data source to sync.
 * @param props.body - Details for scheduling and configuration of the sync
 *   task.
 * @returns The newly created synchronization task with all timestamps and
 *   status.
 * @throws {Error} When the specified data source is not found or inactive.
 */
export async function postflexOfficeEditorDataSourcesDataSourceIdSyncs(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceSync.ICreate;
}): Promise<IFlexOfficeDataSourceSync> {
  const { editor, dataSourceId, body } = props;

  // Verify data source exists and is active (not deleted)
  const dataSource = await MyGlobal.prisma.flex_office_data_sources.findFirst({
    where: {
      id: dataSourceId,
      deleted_at: null,
      is_active: true,
    },
  });

  if (!dataSource) throw new Error("Data source not found or inactive");

  // Generate UUID for new sync record
  const newId = v4() as string & tags.Format<"uuid">;

  // Create new sync record
  const created = await MyGlobal.prisma.flex_office_data_source_syncs.create({
    data: {
      id: newId,
      flex_office_data_source_id: dataSourceId,
      scheduled_at: body.scheduled_at,
      started_at: body.started_at ?? null,
      completed_at: body.completed_at ?? null,
      status: body.status,
      error_message: body.error_message ?? null,
      // created_at and updated_at handled by Prisma defaults
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    flex_office_data_source_id: created.flex_office_data_source_id as string &
      tags.Format<"uuid">,
    scheduled_at: created.scheduled_at as string & tags.Format<"date-time">,
    started_at: created.started_at
      ? (created.started_at as string & tags.Format<"date-time">)
      : null,
    completed_at: created.completed_at
      ? (created.completed_at as string & tags.Format<"date-time">)
      : null,
    status: created.status,
    error_message: created.error_message ?? null,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
  };
}
