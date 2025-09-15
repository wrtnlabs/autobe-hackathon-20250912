import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a system configuration setting by its unique ID.
 *
 * This operation removes a single record from the flex_office_system_settings
 * table. Only administrators are authorized to perform this permanent deletion.
 * If the specified ID does not exist, an error will be thrown.
 *
 * @param props - Object containing the authenticated admin and the ID of the
 *   system setting
 * @param props.admin - The authenticated admin payload performing the deletion
 * @param props.id - The UUID string identifier of the system setting to delete
 * @returns Void
 * @throws {Error} When the record with the specified ID is not found or other
 *   DB errors occur
 */
export async function deleteflexOfficeAdminSystemSettingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  await MyGlobal.prisma.flex_office_system_settings.delete({
    where: { id },
  });
}
