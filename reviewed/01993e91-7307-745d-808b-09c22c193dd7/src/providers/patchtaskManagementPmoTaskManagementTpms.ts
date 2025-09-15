import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { IPageITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTpm";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Search and retrieve a paginated list of TPM user accounts.
 *
 * This endpoint allows authorized PMO users to fetch paginated TPM user
 * summaries. It supports filtering by search term matching email or name
 * fields. Only non-deleted TPM users (deleted_at IS NULL) are included.
 *
 * @param props - Object containing authentication and request body
 * @param props.pmo - The authenticated PMO user payload
 * @param props.body - The search and pagination request body
 * @returns Paginated TPM user summaries matching the search criterion
 * @throws {Error} Throws if any database or system error occurs
 */
export async function patchtaskManagementPmoTaskManagementTpms(props: {
  pmo: PmoPayload;
  body: ITaskManagementTpm.IRequest;
}): Promise<IPageITaskManagementTpm.ISummary> {
  const { pmo, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereConditions: {
    deleted_at: null;
    OR?: { email: { contains: string } }[] | { name: { contains: string } }[];
  } = {
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    whereConditions.OR = [
      { email: { contains: body.search } },
      { name: { contains: body.search } },
    ];
  }

  const [total, records] = await Promise.all([
    MyGlobal.prisma.task_management_tpm.count({ where: whereConditions }),
    MyGlobal.prisma.task_management_tpm.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      email: record.email,
      name: record.name,
    })),
  };
}
