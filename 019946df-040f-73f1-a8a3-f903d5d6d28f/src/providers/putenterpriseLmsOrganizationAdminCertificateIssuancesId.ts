import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Updates a certificate issuance record by its unique ID.
 *
 * This operation allows partial updates to certificate issuance information,
 * including issue date, expiration date, status, and business workflow state.
 * Status must be one of the allowed values: 'valid', 'expired', or 'revoked'.
 *
 * @param props - The update parameters and authentication payload.
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the update.
 * @param props.id - The UUID of the certificate issuance record to update.
 * @param props.body - The update data, supporting partial updates.
 * @returns The updated certificate issuance record.
 * @throws {Error} Throws if the status value is invalid or if the record does
 *   not exist.
 */
export async function putenterpriseLmsOrganizationAdminCertificateIssuancesId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsCertificateIssuance.IUpdate;
}): Promise<IEnterpriseLmsCertificateIssuance> {
  const { organizationAdmin, id, body } = props;

  if (body.status !== undefined) {
    const allowedStatuses = ["valid", "expired", "revoked"] as const;
    if (!allowedStatuses.includes(body.status)) {
      throw new Error(
        `Invalid status '${body.status}'. Allowed values: ${allowedStatuses.join(", ")}`,
      );
    }
  }

  const existing =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.update({
      where: { id },
      data: {
        learner_id: body.learner_id ?? undefined,
        certification_id: body.certification_id ?? undefined,
        issue_date: body.issue_date ?? undefined,
        expiration_date:
          body.expiration_date === null
            ? null
            : (body.expiration_date ?? undefined),
        status: body.status ?? undefined,
        business_status:
          body.business_status === null
            ? null
            : (body.business_status ?? undefined),
        updated_at: now,
        deleted_at:
          body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    learner_id: updated.learner_id as string & tags.Format<"uuid">,
    certification_id: updated.certification_id as string & tags.Format<"uuid">,
    issue_date: toISOStringSafe(updated.issue_date),
    expiration_date: updated.expiration_date
      ? toISOStringSafe(updated.expiration_date)
      : null,
    status: updated.status as "valid" | "expired" | "revoked",
    business_status: updated.business_status ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
