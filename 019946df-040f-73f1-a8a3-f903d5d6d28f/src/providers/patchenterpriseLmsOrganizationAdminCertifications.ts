import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import { IPageIEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list paginated tenant certifications
 *
 * This PATCH operation allows clients to search and retrieve certifications for
 * the tenant with advanced filtering, sorting, and pagination options.
 *
 * It supports querying certifications by code, name, status, and lifecycle
 * state.
 *
 * Only authorized users with role organizationAdmin can perform this operation.
 *
 * The response includes paginated summary certification information to optimize
 * list rendering.
 *
 * @param props - Object containing organizationAdmin payload and request body
 *   with search criteria
 * @param props.organizationAdmin - The authenticated organization administrator
 *   making the request
 * @param props.body - The request body containing search filters, pagination
 *   and sorting options
 * @returns Paginated list of certification summaries matching the filters
 * @throws {Error} If the request parameters are invalid or database errors
 *   occur
 */
export async function patchenterpriseLmsOrganizationAdminCertifications(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsCertification.IRequest;
}): Promise<IPageIEnterpriseLmsCertification.ISummary> {
  const { organizationAdmin, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  if (page < 1) throw new Error("Page number must be at least 1.");
  if (limit < 1) throw new Error("Limit must be at least 1.");

  const skip = (page - 1) * limit;

  const where: {
    tenant_id: string & tags.Format<"uuid">;
    deleted_at: null;
    code?: {
      contains: string;
    };
    name?: {
      contains: string;
    };
    status?: string;
    OR?: Array<{
      code?: { contains: string };
      name?: { contains: string };
      description?: { contains: string };
    }>;
  } = {
    tenant_id: organizationAdmin.id as string & tags.Format<"uuid">,
    deleted_at: null,
  };

  if (
    body.code !== undefined &&
    body.code !== null &&
    body.code.trim() !== ""
  ) {
    where.code = { contains: body.code };
  }

  if (
    body.name !== undefined &&
    body.name !== null &&
    body.name.trim() !== ""
  ) {
    where.name = { contains: body.name };
  }

  if (
    body.status !== undefined &&
    body.status !== null &&
    body.status.trim() !== ""
  ) {
    where.status = body.status;
  }

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    where.OR = [
      { code: { contains: body.search } },
      { name: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  const orderByArray: Array<{ [key: string]: "asc" | "desc" }> = [];

  if (body.orderBy && body.orderBy.trim() !== "") {
    const orders = body.orderBy.split(",");
    for (const order of orders) {
      const parts = order.trim().split(/\s+/);
      const field = parts[0];
      const direction = parts[1] === "desc" ? "desc" : "asc";
      if (["code", "name", "status", "created_at"].includes(field)) {
        orderByArray.push({ [field]: direction });
      }
    }
  }

  if (orderByArray.length === 0) {
    orderByArray.push({ created_at: "desc" });
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_certifications.findMany({
      where,
      orderBy: orderByArray,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_certifications.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      status: item.status,
    })),
  };
}
