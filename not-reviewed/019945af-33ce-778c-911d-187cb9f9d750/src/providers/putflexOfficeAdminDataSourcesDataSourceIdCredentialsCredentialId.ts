import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a credential associated with a specific FlexOffice data source.
 *
 * This operation updates authentication credentials like OAuth2 tokens or API
 * keys, including credential type, value, and optional expiration date. It
 * ensures that the credential belongs to the specified data source before
 * update, enhances security and maintains integrity. The system automatically
 * updates the "updated_at" timestamp.
 *
 * @param props - Object containing admin authentication, dataSourceId,
 *   credentialId, and body with update fields
 * @returns The updated credential information matching
 *   IFlexOfficeDataSourceCredential
 * @throws {Error} If the credential does not belong to the given data source
 * @throws {Prisma.PrismaClientKnownRequestError} If the credential with given
 *   ID does not exist
 */
export async function putflexOfficeAdminDataSourcesDataSourceIdCredentialsCredentialId(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  credentialId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceCredential.IUpdate;
}): Promise<IFlexOfficeDataSourceCredential> {
  const { admin, dataSourceId, credentialId, body } = props;

  const credential =
    await MyGlobal.prisma.flex_office_data_source_credentials.findUniqueOrThrow(
      {
        where: { id: credentialId },
      },
    );

  if (credential.flex_office_data_source_id !== dataSourceId) {
    throw new Error("Credential does not belong to the specified data source");
  }

  const updated =
    await MyGlobal.prisma.flex_office_data_source_credentials.update({
      where: { id: credentialId },
      data: {
        credential_type: body.credential_type ?? undefined,
        credential_value: body.credential_value ?? undefined,
        expires_at:
          body.expires_at === null ? null : (body.expires_at ?? undefined),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    flex_office_data_source_id: updated.flex_office_data_source_id,
    credential_type: updated.credential_type,
    credential_value: updated.credential_value,
    expires_at: updated.expires_at ? toISOStringSafe(updated.expires_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
