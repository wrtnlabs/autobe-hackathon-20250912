import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information of a specific certificate issuance record by
 * its unique ID.
 *
 * This operation allows an authorized system administrator to fetch the
 * certificate issuance data associated with a learner's certification
 * completion, including timestamps and statuses.
 *
 * @param props - Object containing system administrator payload and certificate
 *   issuance ID
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.id - Unique certificate issuance UUID identifier
 * @returns Detailed certificate issuance record conforming to
 *   IEnterpriseLmsCertificateIssuance
 * @throws {Error} Throws if the certificate issuance record is not found
 */
export async function getenterpriseLmsSystemAdminCertificateIssuancesId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsCertificateIssuance> {
  const record =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.findUniqueOrThrow(
      {
        where: {
          id: props.id,
          deleted_at: null,
        },
      },
    );

  return {
    id: record.id,
    learner_id: record.learner_id,
    certification_id: record.certification_id,
    issue_date: toISOStringSafe(record.issue_date),
    expiration_date: record.expiration_date
      ? toISOStringSafe(record.expiration_date)
      : null,
    status: record.status as "valid" | "expired" | "revoked",
    business_status: record.business_status ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
