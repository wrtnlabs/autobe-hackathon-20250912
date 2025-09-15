import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update details of a theme by ID in flex_office_themes
 *
 * This operation updates the specified UI theme's name and CSS styles based on
 * the provided update data. Only authorized editor users should perform this
 * action to ensure UI consistency and security.
 *
 * @param props - Object containing the authenticated editor, theme ID, and
 *   update data with optional name and CSS fields.
 * @param props.editor - Authenticated editor making the request.
 * @param props.id - UUID of the theme to update.
 * @param props.body - Update data with optional fields name and css.
 * @returns The updated theme information including all attributes and
 *   timestamps.
 * @throws {Error} Throws if the theme ID does not exist or update fails.
 */
export async function putflexOfficeEditorThemesId(props: {
  editor: EditorPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeTheme.IUpdate;
}): Promise<IFlexOfficeTheme> {
  const { editor, id, body } = props;

  const updated = await MyGlobal.prisma.flex_office_themes.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      css: body.css ?? undefined,
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
