import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates the details of a theme, including its name and CSS styles.
 *
 * This operation modifies the theme record identified by the given id path
 * parameter. Only authorized admins can perform this update to prevent
 * unauthorized changes.
 *
 * @param props - Object containing admin payload, theme id, and update body
 * @param props.admin - The authenticated admin performing the update
 * @param props.id - Unique identifier of the target theme
 * @param props.body - Update request body containing optional name and css
 * @returns The updated theme information including timestamps
 * @throws {Error} When the theme id does not exist or update fails
 */
export async function putflexOfficeAdminThemesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeTheme.IUpdate;
}): Promise<IFlexOfficeTheme> {
  const { admin, id, body } = props;

  const updated = await MyGlobal.prisma.flex_office_themes.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      css: body.css ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    css: updated.css ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
