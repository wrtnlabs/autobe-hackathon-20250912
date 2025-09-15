import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update certification details by certification ID
 *
 * This function updates an existing certification entity identified by the
 * provided certification ID. It ensures that only authorized organization
 * administrators can update certifications belonging to their tenant. The
 * update includes fields such as code, name, description, and status. Soft
 * deletion status is respected and cannot be modified here.
 *
 * @param props - Object containing organization admin auth, certification ID,
 *   and update body
 * @returns The updated certification entity
 * @throws {Error} When certification is not found or has been deleted
 */
export async function putenterpriseLmsOrganizationAdminCertificationsCertificationId(props: {
  organizationAdmin: OrganizationadminPayload;
  certificationId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsCertification.IUpdate;
}): Promise<IEnterpriseLmsCertification> {
  const { organizationAdmin, certificationId, body } = props;

  const certification =
    await MyGlobal.prisma.enterprise_lms_certifications.findFirst({
      where: {
        id: certificationId,
        tenant_id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!certification) {
    throw new Error("Certification not found or has been deleted");
  }

  const updated = await MyGlobal.prisma.enterprise_lms_certifications.update({
    where: { id: certificationId },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      status: body.status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
