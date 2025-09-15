import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { IPageITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementQa";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * List QA user accounts with filtering and pagination.
 *
 * Retrieves paginated Quality Assurance (QA) user accounts filtered by optional
 * email, name, created_at, and updated_at parameters. Supports sorting by email
 * in ascending or descending order.
 *
 * Requires authorization with TPM role.
 *
 * @param props - Object containing TPM payload and filter criteria.
 * @param props.tpm - Authenticated TPM payload.
 * @param props.body - Filter and pagination criteria for QA users.
 * @returns A paginated summary list of QA user accounts matching the search
 *   criteria.
 * @throws {Error} Throws on invalid pagination parameters or database errors.
 */
export async function patchtaskManagementTpmTaskManagementQas(props: {
  tpm: TpmPayload;
  body: ITaskManagementQa.IRequest;
}): Promise<IPageITaskManagementQa.ISummary> {
  const { tpm, body } = props;

  // Pagination defaults with safe removal of branded tags for Prisma
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  if (page < 1) throw new Error("Page must be at least 1");
  if (limit < 1) throw new Error("Limit must be at least 1");

  const skip = (page - 1) * limit;

  // Build where clause with filters; exclude soft deleted records
  const where = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && {
        created_at: body.created_at,
      }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && {
        updated_at: body.updated_at,
      }),
  };

  // Determine orderBy direction based on sort string
  let orderBy: { email: "asc" | "desc" } = { email: "asc" };
  if (body.sort !== undefined && body.sort !== null) {
    if (body.sort.startsWith("+") && body.sort.slice(1) === "email") {
      orderBy = { email: "asc" };
    } else if (body.sort.startsWith("-") && body.sort.slice(1) === "email") {
      orderBy = { email: "desc" };
    } else {
      throw new Error("Invalid sort value");
    }
  }

  // Query database simultaneously for filtered data and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_qa.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_qa.count({ where }),
  ]);

  // Map results to API response type
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
      name: item.name,
    })),
  };
}
