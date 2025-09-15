import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update certificate issuance data for a given certificate issuance ID.
 *
 * This operation supports modification of certificate issuance details
 * including issue date, expiration date, status, and any business state
 * information. The update operation requires the certificate issuance ID as a
 * path parameter and the updated data in the request body.
 *
 * It performs validation to ensure the status value is one of the allowed
 * states ('valid', 'expired', 'revoked'), and that date fields are in valid ISO
 * 8601 format.
 *
 * Authorization roles such as systemAdmin and organizationAdmin are required
 * for access.
 *
 * Partial updates are supported respecting the schema. Attempts to update
 * non-existent records will throw a 404 error.
 *
 * @param props - Object containing systemAdmin authentication, certificate
 *   issuance ID, and update body.
 * @param props.systemAdmin - Authenticated system administrator payload.
 * @param props.id - Unique identifier of the certificate issuance record to
 *   update.
 * @param props.body - Partial update data for the certificate issuance.
 * @returns Updated certificate issuance record.
 * @throws {Error} Throws error when the certificate issuance record does not
 *   exist.
 * @throws {Error} Throws error when an invalid status value is provided.
 */
export async function putenterpriseLmsSystemAdminCertificateIssuancesId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsCertificateIssuance.IUpdate;
}): Promise<IEnterpriseLmsCertificateIssuance> {
  const { systemAdmin, id, body } = props;

  // Verify that the certificate issuance record exists
  await MyGlobal.prisma.enterprise_lms_certificate_issuances.findUniqueOrThrow({
    where: { id },
  });

  // Validate the status if provided
  if (
    body.status !== undefined &&
    body.status !== "valid" &&
    body.status !== "expired" &&
    body.status !== "revoked"
  ) {
    throw new Error(`Invalid status value: ${body.status}`);
  }

  // Prepare timestamp for update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Prepare update data object
  const data = {
    learner_id: body.learner_id ?? undefined,
    certification_id: body.certification_id ?? undefined,
    issue_date: body.issue_date ? toISOStringSafe(body.issue_date) : undefined,
    expiration_date:
      body.expiration_date === null
        ? null
        : body.expiration_date
          ? toISOStringSafe(body.expiration_date)
          : undefined,
    status: body.status ?? undefined,
    business_status:
      body.business_status === null
        ? null
        : (body.business_status ?? undefined),
    created_at: body.created_at ? toISOStringSafe(body.created_at) : undefined,
    updated_at: now,
    deleted_at:
      body.deleted_at === null
        ? null
        : body.deleted_at
          ? toISOStringSafe(body.deleted_at)
          : undefined,
  };

  // Perform the update in the database
  const updated =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.update({
      where: { id },
      data,
    });

  // Return the updated record in correct types
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
