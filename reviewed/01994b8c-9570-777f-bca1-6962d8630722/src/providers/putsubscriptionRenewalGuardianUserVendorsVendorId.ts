import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update an existing subscription vendor's information.
 *
 * Allows updating the vendor's unique name, ensuring uniqueness constraints.
 * Validates user authorization and vendor existence.
 *
 * @param props - Object containing user payload, vendorId path parameter, and
 *   update body.
 * @param props.user - Authenticated user making the request.
 * @param props.vendorId - UUID of the vendor to update.
 * @param props.body - Vendor update data.
 * @returns Updated subscription vendor details.
 * @throws {Error} When unauthorized user or vendor not found.
 * @throws {Error} When vendor name is duplicate.
 */
export async function putsubscriptionRenewalGuardianUserVendorsVendorId(props: {
  user: UserPayload;
  vendorId: string & tags.Format<"uuid">;
  body: ISubscriptionRenewalGuardianVendor.IUpdate;
}): Promise<ISubscriptionRenewalGuardianVendor> {
  const { user, vendorId, body } = props;

  // Verify user authorization
  const existingUser =
    await MyGlobal.prisma.subscription_renewal_guardian_user.findUniqueOrThrow({
      where: { id: user.id },
    });

  // Verify vendor existence
  const existingVendor =
    await MyGlobal.prisma.subscription_renewal_guardian_vendors.findUniqueOrThrow(
      {
        where: { id: vendorId },
      },
    );

  // Check for name uniqueness if name is provided
  if (body.name !== undefined && body.name !== null) {
    const duplicateVendor =
      await MyGlobal.prisma.subscription_renewal_guardian_vendors.findFirst({
        where: { name: body.name, NOT: { id: vendorId } },
      });
    if (duplicateVendor) {
      throw new Error("Vendor name must be unique");
    }
  }

  // Update vendor
  const updated =
    await MyGlobal.prisma.subscription_renewal_guardian_vendors.update({
      where: { id: vendorId },
      data: {
        name: body.name ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
