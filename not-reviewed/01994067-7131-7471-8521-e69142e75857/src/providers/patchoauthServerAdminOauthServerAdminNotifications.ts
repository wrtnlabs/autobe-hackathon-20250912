import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";
import { IPageIOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerAdminNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchoauthServerAdminOauthServerAdminNotifications(props: {
  admin: AdminPayload;
  body: IOauthServerAdminNotification.IRequest;
}): Promise<IPageIOauthServerAdminNotification> {
  const { admin, body } = props;

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const results =
    await MyGlobal.prisma.oauth_server_admin_notifications.findMany({
      where: {
        admin_id: admin.id,
        title: { contains: body.title },
        message: { contains: body.message },
        is_read: body.is_read,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });

  const total = await MyGlobal.prisma.oauth_server_admin_notifications.count({
    where: {
      admin_id: admin.id,
      title: { contains: body.title },
      message: { contains: body.message },
      is_read: body.is_read,
      deleted_at: null,
    },
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      admin_id: item.admin_id,
      title: item.title,
      message: item.message,
      is_read: item.is_read,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
