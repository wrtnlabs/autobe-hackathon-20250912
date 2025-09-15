import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing FlexOffice custom script by ID.
 *
 * This operation updates the properties of a custom script including 'code',
 * 'name', 'description', 'script_language', and 'script_content'. Only
 * authenticated admins can perform this update.
 *
 * @param props - Object properties including admin authorization, script ID,
 *   and update data
 * @param props.admin - Authenticated admin payload for authorization
 * @param props.id - Unique UUID of the custom script to update
 * @param props.body - Data containing fields to update
 * @returns The updated FlexOffice custom script entity with all fields
 * @throws {Error} If the custom script is not found by the given ID
 */
export async function putflexOfficeAdminCustomScriptsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeCustomScript.IUpdate;
}): Promise<IFlexOfficeCustomScript> {
  const { admin, id, body } = props;

  const existing = await MyGlobal.prisma.flex_office_custom_scripts.findUnique({
    where: { id },
  });

  if (!existing) throw new Error(`Custom Script with id ${id} not found`);

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.flex_office_custom_scripts.update({
    where: { id },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      script_language: body.script_language ?? undefined,
      script_content: body.script_content ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    script_language: updated.script_language,
    script_content: updated.script_content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
