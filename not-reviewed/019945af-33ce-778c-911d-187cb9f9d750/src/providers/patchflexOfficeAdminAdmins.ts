import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import { IPageIFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of administrative users from the
 * flex_office_admins table with optional email filtering.
 *
 * This function supports searching by partial email matches, paginating results
 * with page and limit, and sorting by creation date descending. Only admins
 * with valid authorization can invoke this operation.
 *
 * @param props - Object containing the authenticated admin and the search
 *   request parameters.
 * @param props.admin - The authenticated admin user invoking the search.
 * @param props.body - The search criteria including optional page, limit, and
 *   search string.
 * @returns Paginated summary of administrative users matching the search
 *   criteria.
 * @throws Error - Throws if database operations fail.
 */
export async function patchflexOfficeAdminAdmins(props: {
  admin: AdminPayload;
  body: IFlexOfficeAdmin.IRequest;
}): Promise<IPageIFlexOfficeAdmin.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        email: { contains: body.search },
      }),
  };

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.flex_office_admins.findMany({
      where,
      select: {
        id: true,
        email: true,
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
    })),
  };
}
