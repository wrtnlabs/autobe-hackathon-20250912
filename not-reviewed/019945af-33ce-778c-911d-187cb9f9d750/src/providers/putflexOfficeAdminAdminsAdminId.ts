import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing admin user by ID.
 *
 * This operation updates the specified admin's email and/or password hash. It
 * ensures the admin exists and is not soft-deleted, validates the email
 * uniqueness, and updates the audit timestamp.
 *
 * @param props - Object containing the authenticated admin payload, the admin
 *   ID, and the update payload.
 * @param props.admin - The authenticated admin performing the update.
 * @param props.adminId - The UUID of the admin to update.
 * @param props.body - The update data containing optional email and password
 *   hash.
 * @returns The updated admin user entity.
 * @throws {Error} When the admin does not exist or is soft deleted.
 * @throws {Error} When the new email is already in use by another admin.
 */
export async function putflexOfficeAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IFlexOfficeAdmin.IUpdate;
}): Promise<IFlexOfficeAdmin> {
  const { admin, adminId, body } = props;

  // Verify if the admin with adminId exists and is not deleted
  const existingAdmin = await MyGlobal.prisma.flex_office_admins.findFirst({
    where: {
      id: adminId,
      deleted_at: null,
    },
  });

  if (!existingAdmin) {
    throw new Error(`Admin user not found for id: ${adminId}`);
  }

  // If email is provided and changed, ensure it's unique
  if (body.email && body.email !== existingAdmin.email) {
    const emailCount = await MyGlobal.prisma.flex_office_admins.count({
      where: {
        email: body.email,
        NOT: {
          id: adminId,
        },
        deleted_at: null,
      },
    });
    if (emailCount > 0) {
      throw new Error(
        `Email '${body.email}' is already in use by another admin.`,
      );
    }
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.flex_office_admins.update({
    where: {
      id: adminId,
    },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
