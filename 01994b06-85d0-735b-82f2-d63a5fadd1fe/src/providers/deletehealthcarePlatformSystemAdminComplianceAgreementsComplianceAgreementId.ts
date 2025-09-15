import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently and irreversibly delete a compliance agreement by UUID.
 *
 * This operation removes the compliance agreement record from the
 * healthcare_platform_compliance_agreements table. Only system administrators
 * may invoke this method. All deletion actions are logged to the audit log
 * table for compliance and regulatory tracking. If the agreement does not
 * exist, an error is thrown. This function does not use soft delete and is
 * intended for situations where removal is mandated by legal, compliance, or
 * business policy.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - JWT payload for the authenticated system
 *   administrator
 * @param props.complianceAgreementId - UUID of the compliance agreement to
 *   permanently delete
 * @returns Void (no return value)
 * @throws {Error} If the compliance agreement does not exist or the user is
 *   unauthorized
 */
export async function deletehealthcarePlatformSystemAdminComplianceAgreementsComplianceAgreementId(props: {
  systemAdmin: SystemadminPayload;
  complianceAgreementId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, complianceAgreementId } = props;
  const agreement =
    await MyGlobal.prisma.healthcare_platform_compliance_agreements.findUnique({
      where: { id: complianceAgreementId },
    });
  if (!agreement) {
    throw new Error("Compliance agreement not found");
  }
  await MyGlobal.prisma.healthcare_platform_compliance_agreements.delete({
    where: { id: complianceAgreementId },
  });
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: systemAdmin.id,
      organization_id: agreement.organization_id,
      action_type: "DELETE_COMPLIANCE_AGREEMENT",
      event_context: JSON.stringify({ complianceAgreement: agreement }),
      ip_address: undefined,
      related_entity_type: "COMPLIANCE_AGREEMENT",
      related_entity_id: agreement.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
