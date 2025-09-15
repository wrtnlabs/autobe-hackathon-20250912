import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new table permission record linking permission and table.
 *
 * This POST operation allows an admin to create a new
 * flex_office_table_permissions record. It assigns a specific permission to a
 * database table, enabling fine-grained access control within the FlexOffice
 * platform.
 *
 * @param props - Object containing admin authorization and creation data.
 * @param props.admin - The authenticated admin payload.
 * @param props.body - The details for creating a table permission, including
 *   permission_id and table_name.
 * @returns The newly created table permission record including IDs and
 *   timestamps.
 * @throws {Error} If the underlying database operation fails.
 */
export async function postflexOfficeAdminTablePermissions(props: {
  admin: AdminPayload;
  body: IFlexOfficeTablePermission.ICreate;
}): Promise<IFlexOfficeTablePermission> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_table_permissions.create({
    data: {
      id,
      permission_id: body.permission_id,
      table_name: body.table_name,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    permission_id: created.permission_id as string & tags.Format<"uuid">,
    table_name: created.table_name,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at
      ? (created.deleted_at as string & tags.Format<"date-time">)
      : null,
  };
}
