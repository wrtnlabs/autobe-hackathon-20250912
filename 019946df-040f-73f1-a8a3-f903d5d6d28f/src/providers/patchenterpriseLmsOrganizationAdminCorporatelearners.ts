import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { IPageIEnterpriseLmsCorporatelearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCorporatelearner";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Fetch a filtered and paginated list of corporate learners in the Enterprise
 * LMS.
 *
 * Supports search by email, first name, last name, and filtering by status.
 * Enforces tenant scope via organizationAdmin's tenant ID. Implements
 * pagination and returns metadata for client UI consumption.
 *
 * @param props - Object containing organizationAdmin auth payload and request
 *   filters
 * @param props.organizationAdmin - Authenticated organization admin user with
 *   tenant scope
 * @param props.body - Filtering and pagination criteria for corporate learners
 * @returns Paginated corporate learner summary data conforming to
 *   IPageIEnterpriseLmsCorporatelearner.ISummary
 * @throws {Error} Throws if database operation fails
 */
export async function patchenterpriseLmsOrganizationAdminCorporatelearners(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsCorporateLearner.IRequest;
}): Promise<IPageIEnterpriseLmsCorporatelearner.ISummary> {
  const { organizationAdmin, body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  const whereConditions = {
    tenant_id: organizationAdmin.id,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.trim() !== "" && {
        OR: [
          { email: { contains: body.search } },
          { first_name: { contains: body.search } },
          { last_name: { contains: body.search } },
        ],
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_corporatelearner.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_corporatelearner.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      status: r.status,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
