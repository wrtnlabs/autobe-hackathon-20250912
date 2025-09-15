import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAccessLog";
import { IPageIHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAccessLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function patchhealthcarePlatformSystemAdminAccessLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformAccessLog.IRequest;
}): Promise<IPageIHealthcarePlatformAccessLog.ISummary> {
  const { body } = props;
  // Pagination controls
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (Number(page) - 1) * Number(limit);

  // Allowed sort fields (must be indexed fields in Prisma)
  const allowedSortFields: ReadonlyArray<string> = [
    "created_at",
    "user_id",
    "organization_id",
    "resource_type",
    "resource_id",
  ];
  let orderByField = "created_at";
  let orderDir = "desc" as "asc" | "desc";
  if (body.sort) {
    const [rawField, rawDir] = body.sort.split(":");
    if (rawField && allowedSortFields.includes(rawField))
      orderByField = rawField;
    if (rawDir === "asc" || rawDir === "desc") orderDir = rawDir;
  }

  // Build where clause using only provided values (skip undefined/null)
  const where = {
    ...(body.actor !== undefined &&
      body.actor !== null && { user_id: body.actor }),
    ...(body.organization !== undefined &&
      body.organization !== null && { organization_id: body.organization }),
    ...(body.resource_type !== undefined &&
      body.resource_type !== null && { resource_type: body.resource_type }),
    ...(body.resource_id !== undefined &&
      body.resource_id !== null && { resource_id: body.resource_id }),
    ...((body.from !== undefined && body.from !== null) ||
    (body.to !== undefined && body.to !== null)
      ? {
          created_at: {
            ...(body.from !== undefined &&
              body.from !== null && { gte: body.from }),
            ...(body.to !== undefined && body.to !== null && { lte: body.to }),
          },
        }
      : {}),
  };

  // Concurrently fetch data and record count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_access_logs.findMany({
      where,
      orderBy: { [orderByField]: orderDir },
      skip,
      take: Number(limit),
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        resource_type: true,
        resource_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_access_logs.count({ where }),
  ]);

  // Map database rows to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    organization_id: row.organization_id,
    resource_type: row.resource_type,
    resource_id: row.resource_id === null ? undefined : row.resource_id,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Calculate number of pages using plain number for pagination
  const pages = Number(limit) > 0 ? Math.ceil(total / Number(limit)) : 1;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
