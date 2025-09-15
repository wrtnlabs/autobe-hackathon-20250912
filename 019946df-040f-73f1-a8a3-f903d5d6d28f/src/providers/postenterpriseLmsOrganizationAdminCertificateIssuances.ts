import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new certificate issuance record to document that a learner has been
 * awarded a specific certification.
 *
 * This operation accepts the required data to record the issuance of a
 * certificate including learner ID, certification ID, issue date, status,
 * optional expiration date, and optional business workflow status.
 *
 * It validates that the referenced learner and certification exist and are
 * active (not soft deleted). It prevents duplications by ensuring the learner
 * and certification combination does not already exist.
 *
 * Upon success, the newly created certificate issuance record is returned with
 * all required and optional fields.
 *
 * @param props - Object containing the organization admin payload and the
 *   certificate issuance creation details
 * @returns The full certificate issuance record after creation
 * @throws Error if the learner or certification does not exist or is deleted
 * @throws Error if a certificate issuance for the provided learner and
 *   certification already exists
 */
export async function postenterpriseLmsOrganizationAdminCertificateIssuances(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsCertificateIssuance.ICreate;
}): Promise<IEnterpriseLmsCertificateIssuance> {
  const { organizationAdmin, body } = props;

  // Confirm the learner exists and is active
  const learner =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findFirst({
      where: { id: body.learner_id, deleted_at: null },
    });
  if (!learner) throw new Error("Learner not found or has been deleted.");

  // Confirm the certification exists and is active
  const certification =
    await MyGlobal.prisma.enterprise_lms_certifications.findFirst({
      where: { id: body.certification_id, deleted_at: null },
    });
  if (!certification)
    throw new Error("Certification not found or has been deleted.");

  // Check for existing certificate issuance
  const existing =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.findFirst({
      where: {
        learner_id: body.learner_id,
        certification_id: body.certification_id,
        deleted_at: null,
      },
    });
  if (existing)
    throw new Error(
      "Certificate issuance already exists for this learner and certification.",
    );

  // Generate a new UUID for the certificate issuance
  const id = v4() as string & tags.Format<"uuid">;

  // Prepare timestamps for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Create the certificate issuance record
  const created =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.create({
      data: {
        id,
        learner_id: body.learner_id,
        certification_id: body.certification_id,
        issue_date: body.issue_date,
        expiration_date: body.expiration_date ?? null,
        status: body.status,
        business_status: body.business_status ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return the created record with date conversions
  return {
    id: created.id,
    learner_id: created.learner_id,
    certification_id: created.certification_id,
    issue_date: created.issue_date,
    expiration_date: created.expiration_date ?? null,
    status: created.status,
    business_status: created.business_status ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
