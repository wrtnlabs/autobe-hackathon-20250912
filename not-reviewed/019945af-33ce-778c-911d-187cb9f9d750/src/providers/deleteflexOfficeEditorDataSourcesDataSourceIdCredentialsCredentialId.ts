import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Erases a credential permanently from a data source.
 *
 * This operation deletes the credential record completely from the
 * flex_office_data_source_credentials table. Only authorized editors may
 * perform this operation.
 *
 * @param props - Object containing the editor payload, data source ID, and
 *   credential ID.
 * @param props.editor - Authenticated editor payload performing the deletion.
 * @param props.dataSourceId - Unique identifier of the data source owning the
 *   credential.
 * @param props.credentialId - Unique identifier of the credential to erase.
 * @throws {Error} When the credential does not exist or does not belong to the
 *   specified data source.
 */
export async function deleteflexOfficeEditorDataSourcesDataSourceIdCredentialsCredentialId(props: {
  editor: EditorPayload;
  dataSourceId: string & tags.Format<"uuid">;
  credentialId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, dataSourceId, credentialId } = props;

  // Verify credential exists and belongs to the data source
  const credential =
    await MyGlobal.prisma.flex_office_data_source_credentials.findFirst({
      where: {
        id: credentialId,
        flex_office_data_source_id: dataSourceId,
      },
    });
  if (!credential) {
    throw new Error(
      "Credential not found or does not belong to the specified data source.",
    );
  }

  // Delete credential permanently (hard delete)
  await MyGlobal.prisma.flex_office_data_source_credentials.delete({
    where: { id: credentialId },
  });
}
