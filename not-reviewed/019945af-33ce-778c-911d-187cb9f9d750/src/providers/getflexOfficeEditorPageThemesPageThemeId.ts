import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve detailed information of a UI page theme by ID.
 *
 * This operation fetches the flex_office_page_themes record matching the
 * provided pageThemeId. It filters out soft-deleted records by checking
 * deleted_at is null.
 *
 * All date-time fields are converted to ISO string format per API contract.
 *
 * @param props - Object containing the authenticated editor and pageThemeId.
 * @param props.editor - Authenticated editor payload for authorization.
 * @param props.pageThemeId - UUID of the page theme to retrieve.
 * @returns Detailed UI page theme information adhering to IFlexOfficePageTheme
 *   interface.
 * @throws {Error} Throws if the page theme with the specified ID does not
 *   exist.
 */
export async function getflexOfficeEditorPageThemesPageThemeId(props: {
  editor: EditorPayload;
  pageThemeId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageTheme> {
  const record =
    await MyGlobal.prisma.flex_office_page_themes.findUniqueOrThrow({
      where: { id: props.pageThemeId, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: record.id,
    name: record.name,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
