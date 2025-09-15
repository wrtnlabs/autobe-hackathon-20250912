import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import { IPageIEnterpriseLmsExternallearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsExternallearner";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve filtered, paginated listing of external learners for tenant.
 *
 * This function enforces tenant boundaries by using the organization admin's
 * tenant ID. It supports filtering by email (search), status, tenant ID
 * (optional), and pagination parameters.
 *
 * No native Date objects are used. All date/time handling is done using ISO
 * string format strings.
 *
 * @param props - Object containing the organization admin payload and filter
 *   criteria
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - Filter and pagination request body for external learners
 * @returns A paginated summary list of external learners restricted to the
 *   tenant's scope
 * @throws {Error} Throws if the organization admin record is not found
 */
export async function patchenterpriseLmsOrganizationAdminExternallearners(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsExternalLearner.IRequest;
}): Promise<IPageIEnterpriseLmsExternallearner.ISummary> {
  const { organizationAdmin, body } = props;

  // Fetch the tenant_id of the organization admin to enforce tenant boundary
  const orgAdminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });

  // Use default pagination if not provided
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    body.limit ?? (10 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const skip = (page - 1) * limit;

  // Compose the where clause for filtering
  const where: {
    tenant_id: string & tags.Format<"uuid">;
    deleted_at: null;
    email?: { contains: string };
    status?: string;
  } & ({ tenant_id: string & tags.Format<"uuid"> } | {}) = {
    tenant_id: orgAdminRecord.tenant_id,
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null) {
    where.email = { contains: body.search };
  }

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (body.tenant_id !== undefined && body.tenant_id !== null) {
    where.tenant_id = body.tenant_id;
  }

  // Fetch data and count concurrently for performance
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_externallearner.findMany({
      where,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
      },
      orderBy: { email: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_externallearner.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      status: r.status,
    })),
  };
}
