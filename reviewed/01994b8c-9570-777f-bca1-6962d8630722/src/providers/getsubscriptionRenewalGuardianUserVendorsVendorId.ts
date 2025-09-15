import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieve detailed vendor information by vendorId.
 *
 * This operation retrieves the vendor's unique name, creation, update, and
 * optional deletion timestamps from the subscription_renewal_guardian_vendors
 * table.
 *
 * Only authenticated users have access to this data via the user parameter.
 *
 * @param props - Object containing the authenticated user and vendorId.
 * @param props.user - Authenticated user payload.
 * @param props.vendorId - UUID of the target subscription vendor.
 * @returns Vendor details including name and timestamps.
 * @throws {Error} Throws if no vendor matches the given vendorId.
 */
export async function getsubscriptionRenewalGuardianUserVendorsVendorId(props: {
  user: UserPayload;
  vendorId: string & tags.Format<"uuid">;
}): Promise<ISubscriptionRenewalGuardianVendor> {
  const { user, vendorId } = props;

  const vendor =
    await MyGlobal.prisma.subscription_renewal_guardian_vendors.findUniqueOrThrow(
      {
        where: { id: vendorId },
      },
    );

  return {
    id: vendor.id,
    name: vendor.name,
    created_at: toISOStringSafe(vendor.created_at),
    updated_at: toISOStringSafe(vendor.updated_at),
    deleted_at: vendor.deleted_at ? toISOStringSafe(vendor.deleted_at) : null,
  };
}
