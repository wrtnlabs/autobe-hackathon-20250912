import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete an integration setting by ID
 *
 * This function permanently deletes the integration setting record from the
 * database. Only system administrators have permission to perform this
 * operation.
 *
 * @param props - Object containing the systemAdmin payload and the ID of the
 *   integration setting to delete
 * @param props.systemAdmin - Authorized system administrator payload
 * @param props.id - UUID of the integration setting to be deleted
 * @throws {Error} Throws if the integration setting with specified ID does not
 *   exist
 */
export async function deleteenterpriseLmsSystemAdminIntegrationSettingsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.enterprise_lms_integration_settings.delete({
    where: {
      id: props.id,
    },
  });
}
