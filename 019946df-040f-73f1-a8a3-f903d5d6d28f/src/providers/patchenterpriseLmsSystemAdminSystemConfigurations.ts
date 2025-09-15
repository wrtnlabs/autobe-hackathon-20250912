import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfigurations";
import { IPageIEnterpriseLmsSystemConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsSystemConfigurations";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and filter system configurations with pagination and sorting.
 *
 * This operation allows system administrators to find configuration entries
 * based on keys, values, or descriptions with partial match support. Results
 * are paginated and sortable by key or timestamps.
 *
 * Access is restricted to system administrators only.
 *
 * @param props - The properties including authentication and search criteria.
 * @param props.systemAdmin - Authenticated system administrator payload.
 * @param props.body - Search filter criteria and pagination options.
 * @returns Paginated list of system configuration summary records.
 * @throws {Error} Throws error if any unexpected errors occur during the
 *   operation.
 */
export async function patchenterpriseLmsSystemAdminSystemConfigurations(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSystemConfigurations.IRequest;
}): Promise<IPageIEnterpriseLmsSystemConfigurations.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    key?: { contains: string };
    value?: { contains: string };
    description?: { contains: string };
  } = {};

  if (body.key !== undefined && body.key !== null) {
    where.key = { contains: body.key };
  }

  if (body.value !== undefined && body.value !== null) {
    where.value = { contains: body.value };
  }

  if (body.description !== undefined && body.description !== null) {
    where.description = { contains: body.description };
  }

  const orderBy: {
    key?: "asc" | "desc";
    created_at?: "asc" | "desc";
    updated_at?: "asc" | "desc";
  } = {};

  if (
    body.order_by === "key" ||
    body.order_by === "created_at" ||
    body.order_by === "updated_at"
  ) {
    orderBy[body.order_by] = body.order_dir === "desc" ? "desc" : "asc";
  } else {
    orderBy["key"] = "asc";
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_system_configurations.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        key: true,
        value: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_system_configurations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      key: item.key,
      value: item.value,
      description: item.description ?? null,
    })),
  };
}
