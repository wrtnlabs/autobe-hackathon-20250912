import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { IPageITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTpm";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Searches and retrieves a paginated list of TPM user accounts with optional
 * filtering.
 *
 * This function supports pagination and search filters on TPM email and name.
 * It excludes soft-deleted records (deleted_at is not set).
 *
 * @param props - Object containing authenticated TPM payload and search
 *   criteria
 * @param props.tpm - Authenticated TPM user payload
 * @param props.body - Search, pagination, and filtering criteria
 * @returns Paginated TPM user summaries matching the search criteria
 * @throws Error if any internal database error occurs
 */
export async function patchtaskManagementTpmTaskManagementTpms(props: {
  tpm: TpmPayload;
  body: ITaskManagementTpm.IRequest;
}): Promise<IPageITaskManagementTpm.ISummary> {
  const { tpm, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.search !== undefined && body.search !== null
      ? {
          OR: [
            { email: { contains: body.search } },
            { name: { contains: body.search } },
          ],
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_tpm.findMany({
      where: whereCondition,
      select: { id: true, email: true, name: true },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.task_management_tpm.count({ where: whereCondition }),
  ]);

  const data = results.map((tpm) => ({
    id: tpm.id as string & tags.Format<"uuid">,
    email: tpm.email,
    name: tpm.name,
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
