import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new UI/Page Builder theme.
 *
 * Creates a new theme record in the flex_office_themes table with a unique
 * UUID, given name, and optional CSS content for UI customization.
 *
 * Only admin users can perform this operation, and authorization is handled
 * externally via decorators.
 *
 * @param props - Object containing admin authentication and theme creation data
 * @param props.admin - Authenticated admin payload
 * @param props.body - Theme creation details, including name and optional CSS
 * @returns The newly created theme record, including generated UUID and
 *   timestamps
 * @throws {Error} Throws if creation fails, e.g., on unique name conflict
 */
export async function postflexOfficeAdminThemes(props: {
  admin: AdminPayload;
  body: IFlexOfficeTheme.ICreate;
}): Promise<IFlexOfficeTheme> {
  const { body } = props;
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_themes.create({
    data: {
      id,
      name: body.name,
      css: body.css ?? null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    css: created.css ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
