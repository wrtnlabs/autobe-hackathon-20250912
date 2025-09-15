import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get certification expiration details by expiration ID
 *
 * Retrieves detailed information about a specific certification expiration
 * policy identified by its expiration ID and linked certification ID.
 *
 * Accessible only to authorized organization administrators.
 *
 * @param props - Object containing authorization payload and IDs
 * @param props.organizationAdmin - Authorized organization admin payload
 * @param props.certificationId - UUID of the parent certification
 * @param props.expirationId - UUID of the expiration policy
 * @returns Detailed certification expiration policy matching the IDs
 * @throws {Error} If the expiration policy does not exist or access is
 *   unauthorized
 */
export async function getenterpriseLmsOrganizationAdminCertificationsCertificationIdCertificationExpirationsExpirationId(props: {
  organizationAdmin: OrganizationadminPayload;
  certificationId: string & tags.Format<"uuid">;
  expirationId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsCertificationExpiration> {
  const { certificationId, expirationId } = props;

  const expiration =
    await MyGlobal.prisma.enterprise_lms_certification_expirations.findFirstOrThrow(
      {
        where: {
          id: expirationId,
          certification_id: certificationId,
        },
      },
    );

  return {
    id: expiration.id,
    certification_id: expiration.certification_id,
    expiration_period_days: expiration.expiration_period_days,
    renewal_required: expiration.renewal_required,
    notification_period_days: expiration.notification_period_days,
    created_at: toISOStringSafe(expiration.created_at),
    updated_at: toISOStringSafe(expiration.updated_at),
  };
}
