import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new UI/Page Builder theme.
 *
 * Creates a new theme record in the flex_office_themes table. Requires an
 * authenticated editor. The name must be unique. CSS content is optional and
 * can be null. The operation generates a new UUID and lets the database handle
 * timestamps.
 *
 * @param props - Contains the authenticated editor and theme creation data.
 * @param props.editor - The authenticated editor performing the creation.
 * @param props.body - Theme creation data including unique name and optional
 *   CSS.
 * @returns The created theme record including id, name, css, and timestamps.
 * @throws {Error} Throws if the database operation fails, e.g., name
 *   duplication.
 */
export async function postflexOfficeEditorThemes(props: {
  editor: EditorPayload;
  body: IFlexOfficeTheme.ICreate;
}): Promise<IFlexOfficeTheme> {
  const { editor, body } = props;

  // Generate unique UUID for new theme
  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  // Create the new theme in the database
  const created = await MyGlobal.prisma.flex_office_themes.create({
    data: {
      id: newId,
      name: body.name,
      css: body.css ?? null,
    },
  });

  // Return with date-time strings converted properly
  return {
    id: created.id,
    name: created.name,
    css: created.css ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
