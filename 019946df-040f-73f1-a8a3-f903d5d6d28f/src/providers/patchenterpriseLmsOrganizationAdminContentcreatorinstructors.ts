import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import { IPageIEnterpriseLmsContentcreatorinstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentcreatorinstructor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a filtered, paginated list of content
 * creators/instructors
 *
 * Retrieves content creator/instructor user summaries filtered by optional
 * search, status, and paginated with sorting by creation date descending.
 * Access is restricted to organization administrators limited to their tenant
 * scope. Soft-deleted users are excluded.
 *
 * @param props - Object containing organizationAdmin auth and search parameters
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   with tenant scope
 * @param props.body - Search and pagination parameters
 * @returns Paginated list of content creator/instructor summaries
 * @throws {Error} When invalid input values are provided
 */
export async function patchenterpriseLmsOrganizationAdminContentcreatorinstructors(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsContentCreatorInstructor.IRequest;
}): Promise<IPageIEnterpriseLmsContentcreatorinstructor.ISummary> {
  const { organizationAdmin, body } = props;

  // Default pagination parameters
  const page = body.page ?? 0;
  const limit = body.limit ?? 100;

  // Build Prisma WHERE condition
  const whereCondition = {
    tenant_id: organizationAdmin.tenant_id,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { email: { contains: body.search } },
          { first_name: { contains: body.search } },
          { last_name: { contains: body.search } },
        ],
      }),
  };

  // Calculate pagination offset
  const skip = page * limit;

  // Execute queries concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.count({
      where: whereCondition,
    }),
  ]);

  // Map to API summary DTO, dates are excluded as per ISummary
  const data = results.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    email: item.email,
    first_name: item.first_name,
    last_name: item.last_name,
    status: item.status,
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
