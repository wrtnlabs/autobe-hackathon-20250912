import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import { IPageIEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a filtered, paginated list of admin users.
 *
 * This API operation lists administrator user accounts from the event
 * registration platform identity module. It supports filtering, pagination, and
 * sorting of admins, allowing system administrators to efficiently manage and
 * review admin user accounts.
 *
 * Authorization is limited to admin users only.
 *
 * @param props - Object containing the authenticated admin and filter options
 * @param props.admin - The authenticated admin user making the request
 * @param props.body - Search criteria and pagination parameters
 * @returns Paginated list of admin user summaries matching search criteria
 * @throws {Error} When invalid pagination parameters are provided
 */
export async function patcheventRegistrationAdminAdmins(props: {
  admin: AdminPayload;
  body: IEventRegistrationAdmin.IRequest;
}): Promise<IPageIEventRegistrationAdmin.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<2147483647> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<2147483647> as number;

  if (page < 1 || limit < 1) {
    throw new Error(
      "Invalid pagination parameters: page and limit must be greater than 0",
    );
  }

  const where: {
    email_verified?: boolean;
    full_name?: {
      contains: string;
    };
  } = {};

  if (body.email_verified !== undefined && body.email_verified !== null) {
    where.email_verified = body.email_verified;
  }

  if (body.full_name !== undefined && body.full_name !== null) {
    where.full_name = { contains: body.full_name };
  }

  const orderField = body.orderBy ?? "created_at";
  const orderDir =
    body.orderDirection === "asc" || body.orderDirection === "desc"
      ? body.orderDirection
      : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_admins.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderField]: orderDir },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone_number: true,
        profile_picture_url: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.event_registration_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      email: item.email,
      full_name: item.full_name,
      phone_number: item.phone_number ?? null,
      profile_picture_url: item.profile_picture_url ?? null,
      email_verified: item.email_verified,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
