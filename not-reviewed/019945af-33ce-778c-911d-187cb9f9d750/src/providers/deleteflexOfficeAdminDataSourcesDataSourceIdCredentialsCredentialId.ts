import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a credential record identified by its credential ID and
 * associated data source ID.
 *
 * This operation removes the credential from the
 * flex_office_data_source_credentials table with a hard delete. Only authorized
 * administrators (passed as `admin` payload) are allowed to perform this
 * operation.
 *
 * @param props - Object containing the authenticated admin, the ID of the data
 *   source, and the credential ID.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.dataSourceId - The UUID of the data source owning the
 *   credential.
 * @param props.credentialId - The UUID of the credential to be deleted.
 * @throws {Error} Throws if the credential does not exist or if deletion fails.
 */
export async function deleteflexOfficeAdminDataSourcesDataSourceIdCredentialsCredentialId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  credentialId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, dataSourceId, credentialId } = props;

  // Hard delete the credential matching both the credential ID and data source ID
  await MyGlobal.prisma.flex_office_data_source_credentials.delete({
    where: {
      id: credentialId,
      flex_office_data_source_id: dataSourceId,
    },
  });
}
