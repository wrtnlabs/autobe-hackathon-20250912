import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a specific custom script from the Extensibility module.
 *
 * Permanently removes the custom script identified by the given UUID from the
 * flex_office_custom_scripts table. Only active scripts (with deleted_at equal
 * to null) can be deleted. This operation performs a hard delete.
 *
 * Authorization: Only accessible by authenticated admin users.
 *
 * @param props - Object containing the admin payload and script ID.
 * @param props.admin - Authenticated admin user performing the deletion.
 * @param props.id - UUID of the custom script to be deleted.
 * @throws {Error} Throws if the script is not found or is already deleted.
 */
export async function deleteflexOfficeAdminCustomScriptsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify the custom script exists and is active (not soft deleted)
  const script = await MyGlobal.prisma.flex_office_custom_scripts.findFirst({
    where: { id, deleted_at: null },
  });

  if (!script) {
    throw new Error("Custom script not found or already deleted");
  }

  // Perform hard delete of the script
  await MyGlobal.prisma.flex_office_custom_scripts.delete({
    where: { id },
  });
}
