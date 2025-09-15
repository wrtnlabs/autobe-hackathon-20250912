import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Search and retrieve a paginated list of designer users.
 *
 * This endpoint allows PMO users to search designers by email and name with
 * pagination and sorting options. Soft deleted designers are excluded from the
 * results.
 *
 * @param props - The authenticated PMO user and filter criteria.
 * @param props.pmo - The PMO authenticated payload.
 * @param props.body - Filter, pagination, and sort criteria.
 * @returns A paginated summary of designers matching the criteria.
 * @throws {Error} Throws if any unexpected error occurs during database access.
 */
export async function patchtaskManagementPmoTaskManagementDesigners(props: {
  pmo: PmoPayload;
  body: ITaskManagementDesigner.IRequest;
}): Promise<IPageITaskManagementDesigner.ISummary> {
  const { body } = props;

  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;

  // Remove all 'as' usage. Use Number to coerce safely.
  const pageNumber = Number(pageRaw);
  const limitNumber = Number(limitRaw);

  const page = (pageNumber >= 1 ? pageNumber : 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (limitNumber >= 1 ? limitNumber : 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const whereConditions: {
    deleted_at: null;
    email?: { contains: string };
    name?: { contains: string };
  } = {
    deleted_at: null,
  };
  if (body.email !== undefined && body.email !== null) {
    whereConditions.email = { contains: body.email };
  }
  if (body.name !== undefined && body.name !== null) {
    whereConditions.name = { contains: body.name };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.task_management_designer.findMany({
      where: whereConditions,
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy:
        body.sort && body.order
          ? { [body.sort]: body.order }
          : { email: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_designer.count({ where: whereConditions }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => ({
      id: row.id,
      email: row.email as string & tags.Format<"email">,
      name: row.name,
    })),
  };
}
