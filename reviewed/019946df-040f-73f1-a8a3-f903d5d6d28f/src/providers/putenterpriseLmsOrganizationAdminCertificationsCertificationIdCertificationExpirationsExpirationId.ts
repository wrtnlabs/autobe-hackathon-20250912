import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a certification expiration policy for a certification.
 *
 * This endpoint allows organization administrators to update existing
 * certification expiration policies for their managed certifications. It
 * validates that the certification belongs to the admin's tenant and updates
 * only allowed fields.
 *
 * @param props - The request parameters including authorization,
 *   certificationId, expirationId, and update body.
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload.
 * @param props.certificationId - UUID of the certification to update expiration
 *   for.
 * @param props.expirationId - UUID of the specific certification expiration
 *   policy.
 * @param props.body - Partial update data for the expiration policy.
 * @returns The updated certification expiration policy DTO.
 * @throws {Error} Throws if certification not found or access denied.
 * @throws {Error} Throws if expiration policy not found.
 */
export async function putenterpriseLmsOrganizationAdminCertificationsCertificationIdCertificationExpirationsExpirationId(props: {
  organizationAdmin: OrganizationadminPayload;
  certificationId: string & tags.Format<"uuid">;
  expirationId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsCertificationExpiration.IUpdate;
}): Promise<IEnterpriseLmsCertificationExpiration> {
  const { organizationAdmin, certificationId, expirationId, body } = props;

  const certification =
    await MyGlobal.prisma.enterprise_lms_certifications.findFirst({
      where: {
        id: certificationId,
        tenant_id: organizationAdmin.id,
        deleted_at: null,
      },
    });

  if (!certification)
    throw new Error("Certification not found or access denied");

  const expiration =
    await MyGlobal.prisma.enterprise_lms_certification_expirations.findFirst({
      where: {
        id: expirationId,
        certification_id: certificationId,
      },
    });

  if (!expiration) throw new Error("Certification expiration policy not found");

  const updated =
    await MyGlobal.prisma.enterprise_lms_certification_expirations.update({
      where: { id: expirationId },
      data: {
        expiration_period_days: body.expiration_period_days ?? undefined,
        renewal_required: body.renewal_required ?? undefined,
        notification_period_days: body.notification_period_days ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    certification_id: updated.certification_id,
    expiration_period_days: updated.expiration_period_days,
    renewal_required: updated.renewal_required,
    notification_period_days: updated.notification_period_days,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
