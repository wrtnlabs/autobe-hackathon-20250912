import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuditLog";
import { IPageIOauthServerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchoauthServerAdminOauthServerAuditLogs(props: {
  admin: AdminPayload;
  body: IOauthServerAuditLog.IRequest;
}): Promise<IPageIOauthServerAuditLog> {
  const { admin, body } = props;

  // Pagination parameters are not defined in IRequest, so default to 1 and 10
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0> as number;

  const whereCondition = {
    deleted_at: null,
    ...(body.event_type && { event_type: body.event_type }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.actor_type !== undefined &&
      body.actor_type !== null && { actor_type: body.actor_type }),
    ...(body.event_description && {
      event_description: { contains: body.event_description },
    }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && { updated_at: body.updated_at }),
    ...(body.event_timestamp && { event_timestamp: body.event_timestamp }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_audit_logs.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_audit_logs.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      event_type: r.event_type,
      event_timestamp: r.event_timestamp
        ? toISOStringSafe(r.event_timestamp)
        : ("" as string & tags.Format<"date-time">),
      actor_id: r.actor_id ?? null,
      actor_type: r.actor_type ?? null,
      event_description: r.event_description,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
  };
}
