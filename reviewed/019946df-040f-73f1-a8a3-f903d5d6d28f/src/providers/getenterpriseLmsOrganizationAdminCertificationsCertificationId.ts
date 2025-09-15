import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve certification detail by ID
 *
 * This GET operation returns detailed information for the certification
 * identified by certificationId. Only users with organizationAdmin role have
 * access.
 *
 * @param props - The props containing authenticated organizationAdmin and
 *   certificationId parameter
 * @param props.organizationAdmin - Authenticated organizationAdmin payload
 * @param props.certificationId - Unique identifier of the certification to
 *   retrieve
 * @returns The detailed certification entity
 * @throws {Error} When certification is not found or the user is unauthorized
 */
export async function getenterpriseLmsOrganizationAdminCertificationsCertificationId(props: {
  organizationAdmin: OrganizationadminPayload;
  certificationId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsCertification> {
  const { organizationAdmin, certificationId } = props;

  const certification =
    await MyGlobal.prisma.enterprise_lms_certifications.findFirst({
      where: {
        id: certificationId,
        tenant_id: organizationAdmin.id, // Fix to tenant_id
        deleted_at: null,
      },
    });

  if (!certification) {
    throw new Error("Certification not found or unauthorized");
  }

  return {
    id: certification.id,
    tenant_id: certification.tenant_id,
    code: certification.code,
    name: certification.name,
    description: certification.description ?? null,
    status: certification.status,
    created_at: toISOStringSafe(certification.created_at),
    updated_at: toISOStringSafe(certification.updated_at),
    deleted_at: certification.deleted_at
      ? toISOStringSafe(certification.deleted_at)
      : null,
  };
}
