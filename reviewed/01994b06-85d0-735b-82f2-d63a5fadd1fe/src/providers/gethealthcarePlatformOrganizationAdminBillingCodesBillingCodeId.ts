import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information for a specific billing code
 * (healthcare_platform_billing_codes table)
 *
 * This operation returns the full details of a billing code from the
 * healthcare_platform_billing_codes table, identified by its unique UUID.
 * Accessible only to authenticated organization admins, the endpoint provides
 * code, code system, display name, optional description, and active status,
 * along with the entity creation and last modification timestamps. Soft-deleted
 * codes (archived/retired with deleted_at != null) are never returned.
 *
 * @param props - Object containing all required parameters for the operation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request, injected via JWT
 * @param props.billingCodeId - Unique identifier (UUID) for the target billing
 *   code
 * @returns Full detailed record of the billing code as configured for the
 *   organization
 * @throws {Error} If the billing code is not found or has been archived (soft
 *   deleted)
 */
export async function gethealthcarePlatformOrganizationAdminBillingCodesBillingCodeId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingCodeId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingCode> {
  const record =
    await MyGlobal.prisma.healthcare_platform_billing_codes.findFirst({
      where: {
        id: props.billingCodeId,
      },
      select: {
        id: true,
        code: true,
        code_system: true,
        name: true,
        description: true,
        active: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!record) {
    throw new Error("Billing code not found");
  }
  return {
    id: record.id,
    code: record.code,
    code_system: record.code_system,
    name: record.name,
    description: record.description ?? undefined,
    active: record.active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
