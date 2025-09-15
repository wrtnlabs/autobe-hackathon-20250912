import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information of an admin user by their unique adminId.
 *
 * This operation is restricted to authenticated users with admin role.
 *
 * @param props - Object containing authenticated admin and target adminId.
 * @param props.admin - The authenticated admin performing the request.
 * @param props.adminId - The UUID of the admin to retrieve details for.
 * @returns Detailed information of the specified admin user.
 * @throws {Error} When the admin with the given id does not exist.
 */
export async function getflexOfficeAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeAdmin> {
  const { admin, adminId } = props;

  const record = await MyGlobal.prisma.flex_office_admins.findUniqueOrThrow({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  typia.assertGuard<string & tags.Format<"uuid">>(record.id);

  return {
    id: record.id,
    email: record.email,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
