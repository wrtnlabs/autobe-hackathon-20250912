import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a specific certificate issuance record by its unique identifier.
 *
 * This operation permanently removes a certificate issuance record. It is used
 * for revoking or cleaning up certification data that are no longer valid or
 * required within the Enterprise LMS.
 *
 * Because the enterprise_lms_certificate_issuances table does not implement
 * soft delete fields, this action irreversibly removes the record from the
 * database.
 *
 * Proper authorization is required. Only systemAdmins are permitted.
 *
 * @param props - Object containing systemAdmin payload and certificate issuance
 *   ID
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.id - UUID of the certificate issuance record to delete
 * @throws {Error} Throws an error if the certificate issuance record is not
 *   found
 */
export async function deleteenterpriseLmsSystemAdminCertificateIssuancesId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  // Check if the certificate issuance record exists
  const record =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.findUnique({
      where: { id },
    });

  if (!record) throw new Error("Certificate issuance record not found");

  // Perform hard delete as no soft delete field exists
  await MyGlobal.prisma.enterprise_lms_certificate_issuances.delete({
    where: { id },
  });
}
