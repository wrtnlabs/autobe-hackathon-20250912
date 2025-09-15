import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import { IPageIFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceSync";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Searches for synchronization operations of a particular data source
 * identified by dataSourceId. Supports advanced filters, pagination, and
 * sorting to navigate sync history and status.
 *
 * @param props - Object containing admin payload, dataSourceId, and request
 *   body with filters and pagination
 * @param props.admin - Authenticated admin user performing the search
 * @param props.dataSourceId - Unique identifier of the target data source
 * @param props.body - Request body containing filtering and pagination
 *   parameters
 * @returns Paginated list of sync operation records matching criteria
 * @throws {Error} When database query fails or unexpected error occurs
 */
export async function patchflexOfficeAdminDataSourcesDataSourceIdSyncs(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceSync.IRequest;
}): Promise<IPageIFlexOfficeDataSourceSync> {
  const { admin, dataSourceId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where: {
    flex_office_data_source_id: string & tags.Format<"uuid">;
    status?: string;
    scheduled_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    flex_office_data_source_id: dataSourceId,
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
    ...((body.scheduled_at_from !== undefined &&
      body.scheduled_at_from !== null) ||
    (body.scheduled_at_to !== undefined && body.scheduled_at_to !== null)
      ? {
          scheduled_at: {
            ...(body.scheduled_at_from !== undefined &&
            body.scheduled_at_from !== null
              ? { gte: body.scheduled_at_from }
              : {}),
            ...(body.scheduled_at_to !== undefined &&
            body.scheduled_at_to !== null
              ? { lte: body.scheduled_at_to }
              : {}),
          },
        }
      : {}),
  };

  const sortBy = body.sort_by ?? "scheduled_at";
  const sortOrder = body.sort_order ?? "desc";

  const skip = (page - 1) * limit;

  const [syncs, total] = await Promise.all([
    MyGlobal.prisma.flex_office_data_source_syncs.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_data_source_syncs.count({ where }),
  ]);

  const data = syncs.map((sync) => ({
    id: sync.id as string & tags.Format<"uuid">,
    flex_office_data_source_id: sync.flex_office_data_source_id as string &
      tags.Format<"uuid">,
    scheduled_at: toISOStringSafe(sync.scheduled_at),
    started_at: sync.started_at ? toISOStringSafe(sync.started_at) : null,
    completed_at: sync.completed_at ? toISOStringSafe(sync.completed_at) : null,
    status: sync.status,
    error_message: sync.error_message ?? null,
    created_at: toISOStringSafe(sync.created_at),
    updated_at: toISOStringSafe(sync.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
