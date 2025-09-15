import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing UI page
 *
 * This operation updates a FlexOffice UI page by its unique ID providing the
 * ability to modify name, description, status, and theme association.
 *
 * Only authenticated editors (or admins, but restricted here to editors) are
 * authorized to perform this update.
 *
 * @param props - An object containing:
 *
 *   - Editor: The authenticated editor performing the update
 *   - PageId: The UUID of the page to update
 *   - Body: The update data with optional fields flex_office_page_theme_id, name,
 *       description, status, and deleted_at
 *
 * @returns The updated UI page as an IFlexOfficePage object
 * @throws {Error} Throws if the page does not exist or if the updated name
 *   duplicates an existing page name
 */
export async function putflexOfficeEditorPagesPageId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePage.IUpdate;
}): Promise<IFlexOfficePage> {
  const { editor, pageId, body } = props;

  // Verify the page exists and is not soft deleted
  const page = await MyGlobal.prisma.flex_office_pages.findFirst({
    where: {
      id: pageId,
      deleted_at: null,
    },
  });

  if (!page) {
    throw new Error("Page not found");
  }

  // If the name is changed, check for uniqueness
  if (body.name !== undefined && body.name !== page.name) {
    const duplicate = await MyGlobal.prisma.flex_office_pages.findFirst({
      where: {
        name: body.name,
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new Error("Duplicate page name exists");
    }
  }

  // Prepare update data
  const updateData: {
    flex_office_page_theme_id?: string | null;
    name?: string;
    description?: string | null;
    status?: string;
    deleted_at?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if ("flex_office_page_theme_id" in body) {
    updateData.flex_office_page_theme_id =
      body.flex_office_page_theme_id ?? null;
  }
  if (body.name !== undefined) {
    updateData.name = body.name;
  }
  if ("description" in body) {
    updateData.description = body.description ?? null;
  }
  if (body.status !== undefined) {
    updateData.status = body.status;
  }
  if ("deleted_at" in body) {
    updateData.deleted_at = body.deleted_at ?? null;
  }

  // Execute the update
  const updated = await MyGlobal.prisma.flex_office_pages.update({
    where: { id: pageId },
    data: updateData,
  });

  // Return the updated page, converting dates
  return {
    id: updated.id,
    flex_office_page_theme_id: updated.flex_office_page_theme_id ?? null,
    name: updated.name,
    description: updated.description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
