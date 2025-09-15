import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import { IPageIFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceSync";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Searches synchronization records for a given data source with filters,
 * pagination, and sorting.
 *
 * This operation is secured to editors and admins via authorization. It enables
 * querying of sync operations, supporting scheduling, status, and error
 * tracking.
 *
 * @param props - Contains editor authentication, data source identifier, and
 *   search filters.
 * @param props.editor - Authenticated editor payload with UUID and type.
 * @param props.dataSourceId - The UUID of the data source to filter syncs.
 * @param props.body - Filter and pagination options for the sync query.
 * @returns A paginated list of sync records matching the criteria.
 * @throws {Error} Throws if database query fails or other unexpected errors
 *   occur.
 */
export async function patchflexOfficeEditorDataSourcesDataSourceIdSyncs(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceSync.IRequest;
}): Promise<IPageIFlexOfficeDataSourceSync> {
  const { editor, dataSourceId, body } = props;

  // Pagination calculation
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Build where clause respecting nullable and optional filters
  const where: {
    flex_office_data_source_id: string & tags.Format<"uuid">;
    deleted_at: null;
    scheduled_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    status?: string;
  } = {
    flex_office_data_source_id: dataSourceId,
    deleted_at: null,
  };

  if (body.scheduled_at_from !== undefined && body.scheduled_at_from !== null) {
    where.scheduled_at = {
      ...(where.scheduled_at ?? {}),
      gte: body.scheduled_at_from,
    };
  }

  if (body.scheduled_at_to !== undefined && body.scheduled_at_to !== null) {
    where.scheduled_at = {
      ...(where.scheduled_at ?? {}),
      lte: body.scheduled_at_to,
    };
  }

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  // Sorting logic
  const sortBy =
    typeof body.sort_by === "string" && body.sort_by.length > 0
      ? body.sort_by
      : "scheduled_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Concurrent query for data and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_data_source_syncs.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_data_source_syncs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((sync) => ({
      id: sync.id,
      flex_office_data_source_id: sync.flex_office_data_source_id,
      scheduled_at: toISOStringSafe(sync.scheduled_at),
      started_at: sync.started_at ? toISOStringSafe(sync.started_at) : null,
      completed_at: sync.completed_at
        ? toISOStringSafe(sync.completed_at)
        : null,
      status: sync.status,
      error_message: sync.error_message ?? null,
      created_at: toISOStringSafe(sync.created_at),
      updated_at: toISOStringSafe(sync.updated_at),
    })),
  };
}
