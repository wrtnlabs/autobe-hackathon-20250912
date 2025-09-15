import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a certification expiration policy for a certification
 *
 * This operation creates a new certification expiration policy associated with
 * a specific certification in the Enterprise LMS system. It allows defining the
 * expiration period, renewal requirement, and notification period before
 * expiry.
 *
 * Authorization is limited to organizationAdmin roles and input validation is
 * assumed handled externally. This function strictly uses ISO 8601 strings for
 * all dates and generates UUIDs for new records.
 *
 * @param props - The properties object containing the authenticated
 *   organization administrator, certification ID, and request body with
 *   expiration policy data.
 * @returns The newly created certification expiration policy.
 */
export async function postenterpriseLmsOrganizationAdminCertificationsCertificationIdCertificationExpirations(props: {
  organizationAdmin: OrganizationadminPayload;
  certificationId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsCertificationExpiration.ICreate;
}): Promise<IEnterpriseLmsCertificationExpiration> {
  const { organizationAdmin, certificationId, body } = props;
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.enterprise_lms_certification_expirations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        certification_id: certificationId,
        expiration_period_days: body.expiration_period_days,
        renewal_required: body.renewal_required,
        notification_period_days: body.notification_period_days,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    certification_id: created.certification_id,
    expiration_period_days: created.expiration_period_days,
    renewal_required: created.renewal_required,
    notification_period_days: created.notification_period_days,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
  };
}
