import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new UI page theme.
 *
 * This endpoint allows an admin to create a new UI page theme with a unique
 * name and optional description. CSS content is not storable as no schema field
 * exists.
 *
 * @param props - The properties object containing admin authentication and
 *   theme creation data.
 * @param props.admin - The authenticated admin user payload.
 * @param props.body - The theme creation data including name and optional
 *   description.
 * @returns The created UI page theme with all fields populated.
 * @throws {Error} Throws if database unique constraint on name is violated or
 *   other Prisma errors occur.
 */
export async function postflexOfficeAdminPageThemes(props: {
  admin: AdminPayload;
  body: IFlexOfficePageTheme.ICreate;
}): Promise<IFlexOfficePageTheme> {
  const { admin, body } = props;
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_page_themes.create({
    data: {
      id,
      name: body.name,
      description: body.description ?? null,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
