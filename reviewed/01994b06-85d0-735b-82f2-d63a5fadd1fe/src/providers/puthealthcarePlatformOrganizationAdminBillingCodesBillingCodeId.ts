import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a billing code's metadata in the healthcarePlatform billing system.
 *
 * This endpoint allows organization admins to update editable properties of a
 * billing code, such as its display name, description, and 'active' status, by
 * the billingCodeId path parameter. Code and code_system are immutable after
 * creation.
 *
 * All changes are tracked for compliance and require organization admin
 * privileges.
 *
 * @param props - OrganizationAdmin: Authenticated admin payload billingCodeId:
 *   UUID key of the billing code to update body: Update fields per
 *   IHealthcarePlatformBillingCode.IUpdate
 * @returns {IHealthcarePlatformBillingCode} The updated billing code object
 * @throws {Error} If not found or unauthorized
 */
export async function puthealthcarePlatformOrganizationAdminBillingCodesBillingCodeId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingCodeId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingCode.IUpdate;
}): Promise<IHealthcarePlatformBillingCode> {
  const { billingCodeId, body } = props;
  // 1. Fetch record; throw if not found
  const orig =
    await MyGlobal.prisma.healthcare_platform_billing_codes.findUnique({
      where: { id: billingCodeId },
    });
  if (!orig) throw new Error("Billing code not found");

  // 2. Prepare update data; skip undefined
  const updateFields: {
    name?: string;
    description?: string | null;
    active?: boolean;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.active !== undefined && { active: body.active }),
    updated_at: toISOStringSafe(new Date()),
  };

  // 3. Update
  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_codes.update({
      where: { id: billingCodeId },
      data: updateFields,
    });

  // 4. Return complete entity, mapping all dates
  return {
    id: updated.id,
    code: updated.code,
    code_system: updated.code_system,
    name: updated.name,
    // Only set undefined if missing, to follow DTO field
    description: updated.description === null ? undefined : updated.description,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
