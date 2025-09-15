import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details for a single pharmacy transaction
 * (healthcare_platform_pharmacy_transactions)
 *
 * Retrieves the full detail for a specific pharmacy transaction record by ID,
 * including all audit and integration metadata. This endpoint is for
 * systemAdmin use only—used in operational troubleshooting, audit, compliance,
 * and integration workflows.
 *
 * Authorization: Requires SystemadminPayload. Throws Error if no record is
 * found for the given ID. All date fields are formatted as ISO8601 strings and
 * all values are mapped 1:1 as defined in the DTO contract.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin user making the
 *   request (required for authorization; not used in business logic)
 * @param props.pharmacyTransactionId - The unique ID (uuid) of the pharmacy
 *   transaction to retrieve
 * @returns The IHealthcarePlatformPharmacyTransaction record with all fields
 *   populated
 * @throws {Error} When no record is found for given ID
 */
export async function gethealthcarePlatformSystemAdminPharmacyTransactionsPharmacyTransactionId(props: {
  systemAdmin: SystemadminPayload;
  pharmacyTransactionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPharmacyTransaction> {
  const { pharmacyTransactionId } = props;
  const row =
    await MyGlobal.prisma.healthcare_platform_pharmacy_transactions.findUniqueOrThrow(
      {
        where: { id: pharmacyTransactionId },
      },
    );
  return {
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    pharmacy_integration_id: row.pharmacy_integration_id,
    transaction_type: row.transaction_type,
    external_transaction_id: row.external_transaction_id ?? undefined,
    status: row.status,
    status_message: row.status_message ?? undefined,
    payload_reference: row.payload_reference ?? undefined,
    requested_at: toISOStringSafe(row.requested_at),
    transmitted_at: row.transmitted_at
      ? toISOStringSafe(row.transmitted_at)
      : undefined,
    acknowledged_at: row.acknowledged_at
      ? toISOStringSafe(row.acknowledged_at)
      : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  };
}
