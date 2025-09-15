import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCompetency } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCompetency";
import { IPageIEnterpriseLmsCompetency } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCompetency";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a paginated list of competencies for the organization admin user.
 *
 * This operation filters competencies by tenant_id, supports partial matching
 * for code, name, description, filters active (non-deleted) items, and supports
 * sorting. Pagination is controlled via page and limit.
 *
 * @param props - Contains the organizationAdmin authentication payload and the
 *   request body filters
 * @param props.organizationAdmin - Authenticated organization admin user
 * @param props.body - Filter and pagination parameters for competencies
 * @returns A paginated summary list of competencies matching the criteria
 * @throws Error if any unexpected issue occurs during query
 */
export async function patchenterpriseLmsOrganizationAdminCompetencies(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsCompetency.IRequest;
}): Promise<IPageIEnterpriseLmsCompetency.ISummary> {
  const { organizationAdmin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    tenant_id: string & tags.Format<"uuid">;
    code?: { contains: string };
    name?: { contains: string };
    description?: { contains: string };
    deleted_at?: null;
  } = {
    tenant_id: organizationAdmin.id,
  };

  if (body.code !== undefined && body.code !== null) {
    where.code = { contains: body.code };
  }
  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }
  if (body.description !== undefined && body.description !== null) {
    where.description = { contains: body.description };
  }

  if (body.onlyActive) {
    where.deleted_at = null;
  }

  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    const parts = body.sort.split(" ");
    if (parts.length === 2) {
      const [field, direction] = parts;
      if (["code", "name", "created_at", "updated_at"].includes(field)) {
        orderBy = {
          [field]: direction.toLowerCase() === "asc" ? "asc" : "desc",
        };
      }
    }
  }

  const [total, competencies] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_competencies.count({ where }),
    MyGlobal.prisma.enterprise_lms_competencies.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        code: true,
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
    data: competencies.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
    })),
  };
}
