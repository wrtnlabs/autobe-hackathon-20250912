import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve details for a single pharmacy transaction
 * (healthcare_platform_pharmacy_transactions)
 *
 * This operation fetches the complete detail record for a pharmacy transaction
 * using its unique id. Only organization admins may access records belonging to
 * their own organization. All date/datetime fields are strictly returned as
 * ISO8601 strings. No modification or write operation is permitted via this
 * endpoint.
 *
 * @param props - Parameters object
 * @param props.organizationAdmin - The authenticated organization admin
 * @param props.pharmacyTransactionId - Unique pharmacy transaction identifier
 *   (UUID)
 * @returns The IHealthcarePlatformPharmacyTransaction object with all audit and
 *   business metadata
 * @throws {Error} When pharmacy transaction is not found or access is denied
 */
export async function gethealthcarePlatformOrganizationAdminPharmacyTransactionsPharmacyTransactionId(props: {
  organizationAdmin: OrganizationadminPayload;
  pharmacyTransactionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPharmacyTransaction> {
  const { organizationAdmin, pharmacyTransactionId } = props;

  // Step 1: Find the pharmacy transaction (do not scope to admin's org directly on the org admin record)
  const pharmacyTransaction =
    await MyGlobal.prisma.healthcare_platform_pharmacy_transactions.findFirst({
      where: {
        id: pharmacyTransactionId,
        deleted_at: null,
      },
    });
  if (!pharmacyTransaction) {
    throw new Error("Pharmacy transaction not found or access denied.");
  }

  // Step 2: Check if the admin is authorized for this organization
  // Find an organization assignment for this admin user, matching the transaction's org id
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          pharmacyTransaction.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });

  if (!assignment) {
    throw new Error(
      "Access denied: Admin does not belong to this organization.",
    );
  }

  return {
    id: pharmacyTransaction.id,
    healthcare_platform_organization_id:
      pharmacyTransaction.healthcare_platform_organization_id,
    pharmacy_integration_id: pharmacyTransaction.pharmacy_integration_id,
    transaction_type: pharmacyTransaction.transaction_type,
    external_transaction_id:
      pharmacyTransaction.external_transaction_id ?? undefined,
    status: pharmacyTransaction.status,
    status_message: pharmacyTransaction.status_message ?? undefined,
    payload_reference: pharmacyTransaction.payload_reference ?? undefined,
    requested_at: toISOStringSafe(pharmacyTransaction.requested_at),
    transmitted_at: pharmacyTransaction.transmitted_at
      ? toISOStringSafe(pharmacyTransaction.transmitted_at)
      : undefined,
    acknowledged_at: pharmacyTransaction.acknowledged_at
      ? toISOStringSafe(pharmacyTransaction.acknowledged_at)
      : undefined,
    created_at: toISOStringSafe(pharmacyTransaction.created_at),
    updated_at: toISOStringSafe(pharmacyTransaction.updated_at),
    deleted_at: pharmacyTransaction.deleted_at
      ? toISOStringSafe(pharmacyTransaction.deleted_at)
      : undefined,
  };
}
