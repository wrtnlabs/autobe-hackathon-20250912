import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a billing code's metadata in the healthcarePlatform billing system.
 *
 * Updates an existing billing code record identified by `billingCodeId`. This
 * endpoint allows a system administrator to modify mutable fields such as name,
 * description, and active status, while enforcing immutability on code and
 * code_system. All changes are tracked for compliance and audit, and only
 * authorized users (systemAdmin) are permitted to perform this action. Throws
 * an error if the billing code does not exist.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator
 * @param props.billingCodeId - The unique identifier of the billing code to
 *   update
 * @param props.body - The update payload (name, description, active)
 * @returns The updated billing code entity, fully type safe and with all date
 *   fields expressed as branded ISO strings
 * @throws {Error} If the billing code record does not exist
 */
export async function puthealthcarePlatformSystemAdminBillingCodesBillingCodeId(props: {
  systemAdmin: SystemadminPayload;
  billingCodeId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingCode.IUpdate;
}): Promise<IHealthcarePlatformBillingCode> {
  const { systemAdmin, billingCodeId, body } = props;
  // Fetch the billing code by ID
  const record =
    await MyGlobal.prisma.healthcare_platform_billing_codes.findFirst({
      where: { id: billingCodeId },
    });
  if (!record) {
    throw new Error("Billing code not found");
  }

  // Prepare update: only allowed fields (name, description, active), never code/code_system
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_codes.update({
      where: { id: billingCodeId },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        active: body.active ?? undefined,
        updated_at: now,
      },
    });

  // Return result, strictly matching DTO (branded dates, no Date, proper null/undefined handling)
  return {
    id: updated.id,
    code: updated.code,
    code_system: updated.code_system,
    name: updated.name,
    // description is optional, propagate as undefined if null
    description:
      typeof updated.description === "string" ? updated.description : undefined,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
