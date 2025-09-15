import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing FlexOffice permission identified by its unique ID.
 *
 * This operation modifies permssion_key, description, status, and the
 * updated_at timestamp. It ensures that only authorized admin roles can perform
 * this update. Duplicate permission keys are prevented by validation.
 *
 * @param props - Object containing admin authorization info, permission ID, and
 *   update data
 * @param props.admin - The authenticated admin making the request
 * @param props.id - UUID of the permission to update
 * @param props.body - Partial update data for FlexOffice permission
 * @returns The updated FlexOffice permission entity
 * @throws {Error} If the permission does not exist or permission_key is
 *   duplicated
 */
export async function putflexOfficeAdminPermissionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficePermission.IUpdate;
}): Promise<IFlexOfficePermission> {
  const { admin, id, body } = props;

  const permission =
    await MyGlobal.prisma.flex_office_permissions.findUniqueOrThrow({
      where: { id },
    });

  if (
    body.permission_key !== undefined &&
    body.permission_key !== permission.permission_key
  ) {
    const existingKey = await MyGlobal.prisma.flex_office_permissions.findFirst(
      {
        where: {
          permission_key: body.permission_key,
          deleted_at: null,
          NOT: { id },
        },
      },
    );

    if (existingKey) {
      throw new Error("Duplicate permission_key");
    }
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.flex_office_permissions.update({
    where: { id },
    data: {
      permission_key: body.permission_key ?? undefined,
      description: body.description ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    permission_key: updated.permission_key,
    description: updated.description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
