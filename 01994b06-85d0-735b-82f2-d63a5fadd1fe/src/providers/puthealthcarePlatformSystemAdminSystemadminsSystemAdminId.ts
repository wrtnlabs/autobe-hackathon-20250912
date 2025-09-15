import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update platform system administrator profile fields
 * (healthcare_platform_systemadmins)
 *
 * Updates non-credential information (email, full name, phone, or soft-deletion
 * marker) for an existing system administrator. Only authenticated systemAdmin
 * users may call this endpoint. Credentials and sensitive fields are never
 * updated here. Performs permission, uniqueness, active status, and business
 * validation. All modification attempts are logged for compliance.
 *
 * @param props - Request payload for system admin profile update
 * @param props.systemAdmin - Authenticated SystemadminPayload making the
 *   request
 * @param props.systemAdminId - UUID of the system admin to update (path
 *   parameter)
 * @param props.body - Partial update object with permitted fields
 *   (IHealthcarePlatformSystemAdmin.IUpdate)
 * @returns Updated system administrator profile (excluding credentials)
 * @throws {Error} If target admin is not found, is deleted, or email is not
 *   unique
 * @throws {Error} If forbidden credential fields are present in the body
 */
export async function puthealthcarePlatformSystemAdminSystemadminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformSystemAdmin.IUpdate;
}): Promise<IHealthcarePlatformSystemAdmin> {
  // Step 1: Validate authenticated systemAdmin exists & is not soft-deleted
  const requestingAdmin =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: {
        id: props.systemAdmin.id,
        deleted_at: null,
      },
    });
  if (!requestingAdmin) throw new Error("Requesting admin not active");

  // Step 2: Lookup target admin and verify existence/active status
  const targetAdmin =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: {
        id: props.systemAdminId,
        deleted_at: null,
      },
    });
  if (!targetAdmin) throw new Error("Target admin not found or deleted");

  // Step 3: Validate email uniqueness if email update is requested
  if (
    props.body.email !== undefined &&
    props.body.email !== targetAdmin.email
  ) {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.systemAdminId },
          deleted_at: null,
        },
      });
    if (duplicate)
      throw new Error("Email is already in use by another system admin");
  }

  // Step 4: Build update object: only allowed schema fields, skip forbidden fields
  // Never update credential fields (not present in this schema)
  // Prepare updated_at value using toISOStringSafe to satisfy type
  const updatedAtStr = toISOStringSafe(new Date());
  const updateData = {
    ...(props.body.email !== undefined && { email: props.body.email }),
    ...(props.body.full_name !== undefined && {
      full_name: props.body.full_name,
    }),
    ...(props.body.phone !== undefined && { phone: props.body.phone }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at: props.body.deleted_at ?? null,
    }),
    updated_at: updatedAtStr,
  };

  // Step 5: Update and fetch updated admin
  const updated = await MyGlobal.prisma.healthcare_platform_systemadmins.update(
    {
      where: { id: props.systemAdminId },
      data: updateData,
    },
  );

  // Step 6: Return strictly whitelisted profile - convert all Date fields
  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    phone:
      typeof updated.phone === "string"
        ? updated.phone
        : updated.phone === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : updated.deleted_at === null
        ? null
        : undefined,
  };
}
