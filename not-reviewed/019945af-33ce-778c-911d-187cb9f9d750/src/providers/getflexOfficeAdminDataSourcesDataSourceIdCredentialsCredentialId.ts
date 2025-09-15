import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a data source credential.
 *
 * This operation fetches a credential associated with a specific data source,
 * identified by dataSourceId and credentialId. It requires admin
 * authorization.
 *
 * @param props - Object containing:
 *
 *   - Admin: Authenticated admin payload
 *   - DataSourceId: UUID of the data source
 *   - CredentialId: UUID of the credential
 *
 * @returns A Promise resolving to the detailed credential object
 * @throws Error if the credential is not found or unauthorized
 */
export async function getflexOfficeAdminDataSourcesDataSourceIdCredentialsCredentialId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  credentialId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeDataSourceCredential> {
  const { admin, dataSourceId, credentialId } = props;

  const credential =
    await MyGlobal.prisma.flex_office_data_source_credentials.findFirstOrThrow({
      where: {
        id: credentialId,
        flex_office_data_source_id: dataSourceId,
        deleted_at: null,
      },
      select: {
        id: true,
        flex_office_data_source_id: true,
        credential_type: true,
        credential_value: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: credential.id,
    flex_office_data_source_id: credential.flex_office_data_source_id,
    credential_type: credential.credential_type,
    credential_value: credential.credential_value,
    expires_at: credential.expires_at
      ? toISOStringSafe(credential.expires_at)
      : null,
    created_at: toISOStringSafe(credential.created_at),
    updated_at: toISOStringSafe(credential.updated_at),
    deleted_at: credential.deleted_at
      ? toISOStringSafe(credential.deleted_at)
      : null,
  };
}
