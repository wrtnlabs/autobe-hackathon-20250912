import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabOrderTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabOrderTransaction";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a specific lab order transaction detail by labOrderTransactionId
 * (healthcare_platform_lab_order_transactions table)
 *
 * Retrieves a laboratory order transaction record by its unique identifier.
 * Includes full metadata, status, timestamps, integration, and audit details.
 * Authorization requires that the organization admin user matches the
 * organization for this transaction.
 *
 * @param props - Function arguments
 * @param props.organizationAdmin - Authenticated OrganizationadminPayload (must
 *   be active)
 * @param props.labOrderTransactionId - UUID of the target lab order transaction
 * @returns Detailed IHealthcarePlatformLabOrderTransaction record
 * @throws {Error} If transaction is not found, deleted, or does not belong to
 *   the user's organization
 */
export async function gethealthcarePlatformOrganizationAdminLabOrderTransactionsLabOrderTransactionId(props: {
  organizationAdmin: OrganizationadminPayload;
  labOrderTransactionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLabOrderTransaction> {
  const { organizationAdmin, labOrderTransactionId } = props;

  // Step 1: Fetch admin and verify not deleted
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirstOrThrow(
      {
        where: { id: organizationAdmin.id, deleted_at: null },
      },
    );

  // Step 2: Fetch lab order transaction, verify not deleted
  const tx =
    await MyGlobal.prisma.healthcare_platform_lab_order_transactions.findFirstOrThrow(
      {
        where: { id: labOrderTransactionId, deleted_at: null },
      },
    );

  // Step 3: Authorization - check org match
  if (tx.healthcare_platform_organization_id !== admin.id) {
    throw new Error(
      "Unauthorized: Lab order transaction does not belong to your organization.",
    );
  }

  // Step 4: Map and convert all fields - especially date fields
  return {
    id: tx.id,
    healthcare_platform_organization_id: tx.healthcare_platform_organization_id,
    lab_integration_id: tx.lab_integration_id,
    external_lab_order_id: tx.external_lab_order_id ?? undefined,
    status: tx.status,
    status_message: tx.status_message ?? undefined,
    requested_at: toISOStringSafe(tx.requested_at),
    transmitted_at: tx.transmitted_at
      ? toISOStringSafe(tx.transmitted_at)
      : undefined,
    acknowledged_at: tx.acknowledged_at
      ? toISOStringSafe(tx.acknowledged_at)
      : undefined,
    created_at: toISOStringSafe(tx.created_at),
    updated_at: toISOStringSafe(tx.updated_at),
    deleted_at: tx.deleted_at ? toISOStringSafe(tx.deleted_at) : undefined,
  };
}
