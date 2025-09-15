import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Creates a new UI page theme.
 *
 * This operation inserts a new theme record with a unique name and optional
 * description. CSS content is not supported as per current schema.
 *
 * @param props - Contains authenticated editor and theme creation payload
 * @param props.editor - Authenticated editor user payload
 * @param props.body - Theme creation data including unique name and optional
 *   description
 * @returns Created UI page theme with all attributes including timestamps
 * @throws {Error} When the theme name already exists (conflict)
 */
export async function postflexOfficeEditorPageThemes(props: {
  editor: EditorPayload;
  body: IFlexOfficePageTheme.ICreate;
}): Promise<IFlexOfficePageTheme> {
  const { editor, body } = props;

  // Verify the name is unique
  const existing = await MyGlobal.prisma.flex_office_page_themes.findUnique({
    where: { name: body.name },
  });
  if (existing) throw new Error(`Theme name '${body.name}' is already in use.`);

  // Generate a UUID for the new theme
  const id: string & tags.Format<"uuid"> = v4() as unknown as string &
    tags.Format<"uuid">;
  typia.assertGuard<string & tags.Format<"uuid">>(id);

  // Create new theme record
  const created = await MyGlobal.prisma.flex_office_page_themes.create({
    data: {
      id: id,
      name: body.name,
      description: body.description ?? null,
    },
  });

  // Brand returned id
  typia.assertGuard<string & tags.Format<"uuid">>(created.id);

  // Return complete created theme object with converted dates
  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
