import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Get a UI theme by ID
 *
 * Retrieves detailed information about a specific UI/Page Builder theme
 * identified by its unique ID. Only users with admin or editor roles can access
 * this information.
 *
 * @param props - Request properties
 * @param props.editor - The authenticated editor making the request
 * @param props.id - UUID of the UI theme to retrieve
 * @returns The detailed UI theme information
 * @throws {Error} Throws if the theme is not found
 */
export async function getflexOfficeEditorThemesId(props: {
  editor: EditorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeTheme> {
  const { id } = props;

  const theme = await MyGlobal.prisma.flex_office_themes.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      css: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: theme.id,
    name: theme.name,
    css: theme.css ?? null,
    created_at: toISOStringSafe(theme.created_at),
    updated_at: toISOStringSafe(theme.updated_at),
  };
}
