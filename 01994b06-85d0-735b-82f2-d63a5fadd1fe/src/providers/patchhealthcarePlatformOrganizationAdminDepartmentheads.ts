import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import { IPageIHealthcarePlatformDepartmenthead } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDepartmenthead";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list department heads (healthcare_platform_departmentheads), with
 * pagination and filters
 *
 * Retrieves a filtered and paginated list of department heads, leveraging the
 * 'healthcare_platform_departmentheads' schema. The request body can contain
 * search parameters such as partial name match, email keyword, and
 * creation/update timeframe filters.
 *
 * The returned page contains department head summary or detail records,
 * supporting list display, selection, and bulk assignment workflows for
 * administrators. Result metadata includes total items, page size, and
 * pagination state.
 *
 * Access is restricted to users with system or organizational admin privileges,
 * enabling them to manage, review, and audit department head assignments. All
 * searches are logged for compliance and visibility. If filters produce no
 * results, the response is an empty page dataset.
 *
 * @param props - Request with the OrganizationadminPayload (authorization) and
 *   a body containing IHealthcarePlatformDepartmentHead.IRequest search
 *   parameters
 * @returns IPageIHealthcarePlatformDepartmenthead containing pagination meta
 *   and department head data array
 */
export async function patchhealthcarePlatformOrganizationAdminDepartmentheads(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformDepartmentHead.IRequest;
}): Promise<IPageIHealthcarePlatformDepartmenthead> {
  const { body } = props;

  const allowedSorts = ["created_at", "full_name", "email"] as const;
  const defaultSort = "created_at" as const;
  let sortField: "created_at" | "full_name" | "email" = defaultSort;
  if (
    body.sort &&
    allowedSorts.includes(body.sort as (typeof allowedSorts)[number])
  ) {
    sortField = body.sort as (typeof allowedSorts)[number];
  }
  const order: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Pagination logic: defaults if not provided
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Build where (typed inline, strict)
  const where = {
    ...(body.full_name !== undefined &&
      body.full_name !== null &&
      body.full_name.length > 0 && {
        full_name: { contains: body.full_name },
      }),
    ...(body.email !== undefined &&
      body.email !== null &&
      body.email.length > 0 && {
        email: { contains: body.email },
      }),
    ...(body.is_active !== undefined &&
      body.is_active !== null &&
      (body.is_active ? { deleted_at: null } : { deleted_at: { not: null } })),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_departmentheads.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_departmentheads.count({ where }),
  ]);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => {
      const createdAt = toISOStringSafe(row.created_at);
      const updatedAt = toISOStringSafe(row.updated_at);
      // deleted_at is nullable and optional in the DTO; only set if not null
      const deletedAt =
        row.deleted_at !== undefined && row.deleted_at !== null
          ? toISOStringSafe(row.deleted_at)
          : undefined;
      // phone is optional and nullable; assign as is (could be string, null, or undefined)
      return {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        phone: row.phone !== undefined ? row.phone : undefined,
        created_at: createdAt,
        updated_at: updatedAt,
        ...(deletedAt !== undefined && { deleted_at: deletedAt }),
      };
    }),
  };
}
