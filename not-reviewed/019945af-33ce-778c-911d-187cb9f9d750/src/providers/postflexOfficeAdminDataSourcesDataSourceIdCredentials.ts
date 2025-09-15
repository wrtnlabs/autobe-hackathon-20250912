import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new credential entry associated with a specific data source within
 * FlexOffice.
 *
 * Credentials represent authentication information such as OAuth2 tokens or API
 * keys necessary for connecting to data sources. The request provides the
 * creation data in the body and requires the dataSourceId path parameter. Only
 * administrators have permission to create credentials.
 *
 * @param props - Object containing admin payload, dataSourceId path parameter,
 *   and credential creation body
 * @param props.admin - The authenticated admin user performing this operation
 * @param props.dataSourceId - Unique identifier of the data source to which the
 *   credential will be associated
 * @param props.body - The creation information of the new data source
 *   credential
 * @returns Newly created credential record adhering to
 *   IFlexOfficeDataSourceCredential
 * @throws {Error} Throws an error if creation fails or authorization issues
 *   arise
 */
export async function postflexOfficeAdminDataSourcesDataSourceIdCredentials(props: {
  admin: AdminPayload;
  dataSourceId: string & tags.Format<"uuid">;
  body: IFlexOfficeDataSourceCredential.ICreate;
}): Promise<IFlexOfficeDataSourceCredential> {
  const { admin, dataSourceId, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.flex_office_data_source_credentials.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        flex_office_data_source_id: dataSourceId,
        credential_type: body.credential_type,
        credential_value: body.credential_value,
        expires_at:
          body.expires_at === null ? null : toISOStringSafe(body.expires_at),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    flex_office_data_source_id: created.flex_office_data_source_id,
    credential_type: created.credential_type,
    credential_value: created.credential_value,
    expires_at:
      created.expires_at === null ? null : toISOStringSafe(created.expires_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
