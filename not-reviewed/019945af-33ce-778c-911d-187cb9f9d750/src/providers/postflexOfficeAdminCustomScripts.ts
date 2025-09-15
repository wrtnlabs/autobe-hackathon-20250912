import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new FlexOffice custom script.
 *
 * This operation allows an admin user to create an independent programmable
 * module in the FlexOffice system by providing necessary details.
 *
 * @param props - Object containing admin authentication and creation data
 * @param props.admin - Authenticated admin user payload
 * @param props.body - Creation data for the custom script
 * @returns The full created custom script entity with all fields and timestamps
 * @throws {Error} When a script with the same code already exists
 */
export async function postflexOfficeAdminCustomScripts(props: {
  admin: AdminPayload;
  body: IFlexOfficeCustomScript.ICreate;
}): Promise<IFlexOfficeCustomScript> {
  const { admin, body } = props;

  // Check for existing script with the same code (not deleted)
  const existing = await MyGlobal.prisma.flex_office_custom_scripts.findFirst({
    where: { code: body.code, deleted_at: null },
  });
  if (existing) {
    throw new Error("Custom script code already exists");
  }

  // Generate new ID and timestamps
  const newId = v4();
  const now = toISOStringSafe(new Date());

  // Create new record
  const created = await MyGlobal.prisma.flex_office_custom_scripts.create({
    data: {
      id: newId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      script_language: body.script_language,
      script_content: body.script_content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created entity with converted date strings
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    script_language: created.script_language,
    script_content: created.script_content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
