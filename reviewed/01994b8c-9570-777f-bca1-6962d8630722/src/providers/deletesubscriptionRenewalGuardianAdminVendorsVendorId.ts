import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a vendor by its unique identifier.
 *
 * This operation permanently removes the vendor record from the database. It
 * first verifies that the vendor exists, throwing an error if not found.
 * Deletion cascades to related subscriptions due to the Prisma schema
 * relations.
 *
 * Authorization requires an admin user.
 *
 * @param props - Object containing admin payload and vendor ID to delete
 * @param props.admin - The authenticated admin user performing this operation
 * @param props.vendorId - The UUID of the vendor to delete
 * @returns Void
 * @throws {Error} Throws if vendor not found or if unauthorized
 */
export async function deletesubscriptionRenewalGuardianAdminVendorsVendorId(props: {
  admin: AdminPayload;
  vendorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, vendorId } = props;

  // Verify that the vendor exists; throws if not found
  await MyGlobal.prisma.subscription_renewal_guardian_vendors.findUniqueOrThrow(
    {
      where: { id: vendorId },
    },
  );

  // Perform hard delete of the vendor
  await MyGlobal.prisma.subscription_renewal_guardian_vendors.delete({
    where: { id: vendorId },
  });
}
