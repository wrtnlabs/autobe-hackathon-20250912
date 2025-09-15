import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a billing code from the healthcarePlatform's billing code
 * catalog.
 *
 * This operation deletes a billing code (healthcare_platform_billing_codes) by
 * ID, only if it is not currently referenced by any billing items. If the code
 * is in use, an error is thrown; otherwise, the record is hard-deleted from the
 * catalog. All delete actions are logged in the audit log for compliance and
 * traceability.
 *
 * Authorization: Only authenticated systemAdmin users may perform this
 * operation.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated SystemadminPayload (must have
 *   active privileges)
 * @param props.billingCodeId - The unique identifier (UUID) of the billing code
 *   to delete
 * @returns Void
 * @throws {Error} If the billing code is referenced in any billing items
 * @throws {Error} If no such billing code exists (Prisma will throw)
 */
export async function deletehealthcarePlatformSystemAdminBillingCodesBillingCodeId(props: {
  systemAdmin: SystemadminPayload;
  billingCodeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, billingCodeId } = props;

  // Check if the billing code is referenced elsewhere
  const refCount =
    await MyGlobal.prisma.healthcare_platform_billing_items.count({
      where: { billing_code_id: billingCodeId },
    });
  if (refCount > 0) {
    throw new Error("Billing code is in use and cannot be deleted.");
  }

  // Hard delete the billing code
  await MyGlobal.prisma.healthcare_platform_billing_codes.delete({
    where: { id: billingCodeId },
  });

  // Audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      user_id: systemAdmin.id,
      action_type: "DELETE",
      related_entity_type: "BILLING_CODE",
      related_entity_id: billingCodeId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
