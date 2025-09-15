import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import { IPageIFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeViewer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a filtered, paginated list of FlexOffice viewers.
 *
 * This endpoint allows an admin to fetch viewer users with optional search
 * criteria that filters by name or email. It excludes soft deleted viewers.
 *
 * The results are paginated and returned in a summary format optimized for list
 * display.
 *
 * @param props - Object containing admin authorization and request body.
 * @param props.admin - The authenticated admin user.
 * @param props.body - The filtering and pagination request parameters.
 * @returns A paginated summary list of viewer users.
 * @throws {Error} When an unexpected database error occurs.
 */
export async function patchflexOfficeAdminViewers(props: {
  admin: AdminPayload;
  body: IFlexOfficeViewer.IRequest;
}): Promise<IPageIFlexOfficeViewer.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereConditions = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { name: { contains: body.search } },
          { email: { contains: body.search } },
        ],
      }),
  };

  const [resultList, total] = await Promise.all([
    MyGlobal.prisma.flex_office_viewers.findMany({
      where: whereConditions,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
    MyGlobal.prisma.flex_office_viewers.count({ where: whereConditions }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: resultList.map((viewer) => ({
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
    })),
  };
}
