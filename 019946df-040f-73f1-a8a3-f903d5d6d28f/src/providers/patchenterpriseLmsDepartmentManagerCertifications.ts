import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import { IPageIEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertification";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Searches and retrieves a paginated list of certifications associated with the
 * tenant of the department manager.
 *
 * This endpoint supports filtering by code, name, status, and a general search
 * term applied across code, name, and description fields. Results are paginated
 * and can be sorted by specified fields in ascending or descending order.
 *
 * @param props - Object containing the authenticated department manager and the
 *   search request body.
 * @param props.departmentManager - The authenticated department manager
 *   performing the search.
 * @param props.body - The search criteria and pagination parameters.
 * @returns A paginated summary list of certifications matching the search
 *   criteria.
 * @throws {Error} When pagination parameters (page or limit) are invalid.
 */
export async function patchenterpriseLmsDepartmentManagerCertifications(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsCertification.IRequest;
}): Promise<IPageIEnterpriseLmsCertification.ISummary> {
  const { departmentManager, body } = props;

  const page: number = body.page ?? 1;
  const limit: number = body.limit ?? 10;

  if (page < 1) throw new Error("Page must be 1 or greater.");
  if (limit < 1) throw new Error("Limit must be 1 or greater.");

  const where = {
    tenant_id: departmentManager.tenant_id,
    deleted_at: null,
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search } },
          { name: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  };

  let orderBy;
  if (body.orderBy && typeof body.orderBy === "string") {
    const orders = body.orderBy.split(",").map((o) => o.trim());
    orderBy = orders.map((o) => {
      const [field, directionRaw] = o.split(" ").map((x) => x.trim());
      const direction = directionRaw?.toLowerCase() === "asc" ? "asc" : "desc";
      const allowedFields = new Set([
        "code",
        "name",
        "status",
        "created_at",
        "updated_at",
      ]);
      if (!allowedFields.has(field)) {
        return { created_at: "desc" };
      }
      return { [field]: direction };
    });
  } else {
    orderBy = [{ created_at: "desc" }];
  }

  const skip = (page - 1) * limit;

  const [certifications, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_certifications.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: { id: true, code: true, name: true, status: true },
    }),
    MyGlobal.prisma.enterprise_lms_certifications.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: certifications.map((cert) => ({
      id: cert.id,
      code: cert.code,
      name: cert.name,
      status: cert.status,
    })),
  };
}
