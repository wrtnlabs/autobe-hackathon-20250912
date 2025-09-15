import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import { IPageIEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertificationExpiration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Lists certification expiration policies by certification ID.
 *
 * Retrieves paginated expiration policies scoped to the authenticated
 * organization administrator's tenant. Ensures access control by tenant
 * ownership. Supports filtering by renewal requirement and pagination.
 *
 * @param props - Object containing organizationAdmin payload, certificationId,
 *   and request body.
 * @param props.organizationAdmin - Authenticated organization administrator
 *   user info.
 * @param props.certificationId - UUID of the certification to list expiration
 *   policies for.
 * @param props.body - Request body with pagination and filtering parameters.
 * @returns Paginated summary list of certification expiration policies.
 * @throws {Error} When organization administrator is not found.
 * @throws {Error} When certification is not found or unauthorized access is
 *   detected.
 */
export async function patchenterpriseLmsOrganizationAdminCertificationsCertificationIdCertificationExpirations(props: {
  organizationAdmin: OrganizationadminPayload;
  certificationId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsCertificationExpiration.IRequest;
}): Promise<IPageIEnterpriseLmsCertificationExpiration.ISummary> {
  const { organizationAdmin, certificationId, body } = props;

  // Fetch organization admin with tenant info
  const orgAdmin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
    });

  // Verify certification exists and belongs to tenant
  const certification =
    await MyGlobal.prisma.enterprise_lms_certifications.findUniqueOrThrow({
      where: { id: certificationId },
    });

  if (certification.tenant_id !== orgAdmin.tenant_id) {
    throw new Error(
      "Unauthorized: Certification does not belong to your tenant",
    );
  }

  // Pagination setup
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause with optional renewal_required
  const whereClause: {
    certification_id: string & tags.Format<"uuid">;
    deleted_at: null;
    renewal_required?: boolean;
  } = {
    certification_id: certificationId,
    deleted_at: null,
  };

  if (body.renewal_required !== undefined && body.renewal_required !== null) {
    whereClause.renewal_required = body.renewal_required;
  }

  // Fetch list and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_certification_expirations.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_certification_expirations.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      expiration_period_days: item.expiration_period_days,
      renewal_required: item.renewal_required,
      notification_period_days: item.notification_period_days,
    })),
  };
}
