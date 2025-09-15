import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Updates a credential associated with a FlexOffice data source.
 *
 * This operation modifies credential details such as credential type, value,
 * and expiration. It ensures the credential exists and belongs to the specified
 * data source.
 *
 * Authorization is enforced for editor users.
 *
 * @param props - Object containing editor authorization, dataSourceId,
 *   credentialId, and update body
 * @param props.editor - Authenticated editor payload
 * @param props.dataSourceId - UUID of the data source owning the credential
 * @param props.credentialId - UUID of the credential to be updated
 * @param props.body - Partial update data for the credential
 * @returns The updated credential information
 * @throws {Error} If the credential does not exist or does not belong to the
 *   data source
 */
export async function putflexOfficeEditorDataSourcesDataSourceIdCredentialsCredentialId(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  credentialId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceCredential.IUpdate;
}): Promise<IFlexOfficeDataSourceCredential> {
  const { editor, dataSourceId, credentialId, body } = props;

  // Verify the credential exists and belongs to the data source, is not deleted
  const existingCredential =
    await MyGlobal.prisma.flex_office_data_source_credentials.findFirstOrThrow({
      where: {
        id: credentialId,
        flex_office_data_source_id: dataSourceId,
        deleted_at: null,
      },
    });

  // Perform the update with provided fields, setting updated_at to current time
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

  // Return updated credential with proper date string conversions
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
