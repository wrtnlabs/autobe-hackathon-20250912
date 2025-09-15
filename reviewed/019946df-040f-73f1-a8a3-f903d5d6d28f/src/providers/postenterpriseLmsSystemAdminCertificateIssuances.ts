import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Creates a new certificate issuance record.
 *
 * Records that a learner has been awarded a particular certification within the
 * enterprise LMS tenant system. Validates the existence of the learner and
 * certification. Ensures that the combination of learner and certification is
 * unique and not previously issued.
 *
 * @param props - Object containing the system admin payload and the certificate
 *   issuance creation data
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   operation
 * @param props.body - Data needed to create a certificate issuance record
 * @returns The newly created certificate issuance record with all fields
 *   populated and timestamps converted to ISO strings
 * @throws {Error} If the referenced learner or certification does not exist
 * @throws {Error} If a duplicate certificate issuance exists for the same
 *   learner and certification
 */
export async function postenterpriseLmsSystemAdminCertificateIssuances(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsCertificateIssuance.ICreate;
}): Promise<IEnterpriseLmsCertificateIssuance> {
  const { systemAdmin, body } = props;
  const now = toISOStringSafe(new Date());

  // Verify the referenced learner exists
  const learner =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUnique({
      where: { id: body.learner_id },
    });
  if (!learner) throw new Error("Learner not found");

  // Verify the referenced certification exists
  const certification =
    await MyGlobal.prisma.enterprise_lms_certifications.findUnique({
      where: { id: body.certification_id },
    });
  if (!certification) throw new Error("Certification not found");

  // Check for duplicate non-deleted issuance
  const existing =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.findFirst({
      where: {
        learner_id: body.learner_id,
        certification_id: body.certification_id,
        deleted_at: null,
      },
    });

  if (existing) {
    throw new Error(
      "Duplicate certificate issuance for the given learner and certification",
    );
  }

  // Create new certificate issuance
  const created =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.create({
      data: {
        id: v4(),
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
